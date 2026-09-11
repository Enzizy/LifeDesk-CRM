import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import type { Database } from "../_shared/database.types.ts";
import {
  GEOAPIFY_PROVIDER,
  GeoapifyError,
  geocodeLocation,
  sanitizeFilters,
  searchPlaces,
} from "../_shared/geoapify.ts";

type DiscoverRequest = { command?: unknown; filters?: unknown };

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export default {
  fetch: withSupabase<Database>({ auth: "user" }, async (request, context) => {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const userId = context.userClaims?.id;
    if (!userId) return json({ error: "Sign in to run a discovery" }, 401);

    let body: DiscoverRequest;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Request body must be valid JSON" }, 400);
    }

    let filters;
    try {
      filters = sanitizeFilters(body.filters);
    } catch (error) {
      const message = error instanceof GeoapifyError
        ? error.message
        : "The discovery filters are invalid";
      return json({ error: message }, 400);
    }

    const apiKey = Deno.env.get("GEOAPIFY_API_KEY");
    if (!apiKey) return json({ error: "Geoapify is not configured" }, 503);

    const command = typeof body.command === "string" && body.command.trim()
      ? body.command.trim().slice(0, 2_000)
      : `Find ${filters.limit} businesses near ${filters.location}`;

    // Record the run before spending any Geoapify credits, so a failure still
    // leaves an auditable row with its filters and error.
    const { data: run, error: runError } = await context.supabase
      .from("discovery_runs")
      .insert({
        user_id: userId,
        command,
        provider: GEOAPIFY_PROVIDER,
        interpreted_filters: filters,
        result_limit: filters.limit,
        status: "running",
      })
      .select("id")
      .single();

    if (runError || !run) {
      console.error("discovery run insert failed", { code: runError?.code });
      return json({ error: "The discovery run could not be started" }, 500);
    }

    const failRun = async (message: string, status: number) => {
      await context.supabase
        .from("discovery_runs")
        .update({
          status: "failed",
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);
      return json({ error: message, runId: run.id }, status);
    };

    try {
      const centre = await geocodeLocation(filters.location, apiKey);
      const places = await searchPlaces(filters, centre, apiKey);

      if (!places.length) {
        await context.supabase
          .from("discovery_runs")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", run.id);
        return json({
          runId: run.id,
          resolvedLocation: centre.formatted,
          candidates: [],
          skippedDuplicates: 0,
        });
      }

      // The (user_id, provider, provider_place_id) unique index is partial, so
      // ON CONFLICT inference is unreliable through PostgREST. Filter against
      // what this user already has instead, which also lets the response report
      // how many repeats were skipped.
      const placeIds = places
        .map((place) => place.providerPlaceId)
        .filter((id): id is string => Boolean(id));

      const existing = new Set<string>();
      if (placeIds.length) {
        const { data: known, error: knownError } = await context.supabase
          .from("discovery_candidates")
          .select("provider_place_id")
          .eq("provider", GEOAPIFY_PROVIDER)
          .in("provider_place_id", placeIds);
        if (knownError) throw new GeoapifyError("Existing candidates could not be read", 500);
        for (const row of known ?? []) {
          if (row.provider_place_id) existing.add(row.provider_place_id);
        }
      }

      const fresh = places.filter(
        (place) => !place.providerPlaceId || !existing.has(place.providerPlaceId),
      );
      const skippedDuplicates = places.length - fresh.length;

      if (!fresh.length) {
        await context.supabase
          .from("discovery_runs")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", run.id);
        return json({
          runId: run.id,
          resolvedLocation: centre.formatted,
          candidates: [],
          skippedDuplicates,
        });
      }

      const { data: inserted, error: insertError } = await context.supabase
        .from("discovery_candidates")
        .insert(
          fresh.map((place) => ({
            user_id: userId,
            discovery_run_id: run.id,
            provider: GEOAPIFY_PROVIDER,
            provider_place_id: place.providerPlaceId,
            name: place.name,
            category: place.category,
            location: place.location,
            phone: place.phone,
            website: place.website,
            email: place.email,
            socials: place.socials,
            lat: place.lat,
            lon: place.lon,
            // Service fit and qualification are a separate, model-driven step.
            // Discovery only records what the provider actually returned.
            suggested_service: "",
            qualification_reason: "",
            confidence:
              place.website || place.phone || place.email || Object.keys(place.socials).length
                ? "High"
                : "Medium",
            source_payload: {
              provider: GEOAPIFY_PROVIDER,
              lat: place.lat,
              lon: place.lon,
              resolved_location: centre.formatted,
              retrieved_at: new Date().toISOString(),
            },
            review_status: "pending",
          })),
        )
        .select();

      if (insertError) {
        console.error("candidate insert failed", { code: insertError.code });
        return await failRun("Discovered businesses could not be saved", 500);
      }

      await context.supabase
        .from("discovery_runs")
        .update({
          status: skippedDuplicates ? "partial" : "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      return json({
        runId: run.id,
        resolvedLocation: centre.formatted,
        candidates: inserted ?? [],
        skippedDuplicates,
      });
    } catch (error) {
      if (error instanceof GeoapifyError) {
        return await failRun(error.message, error.status);
      }
      console.error("discover-businesses failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      return await failRun("The discovery could not be completed", 502);
    }
  }),
};
