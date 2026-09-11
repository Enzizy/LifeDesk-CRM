import "@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenAI, Type } from "@google/genai";
import { withSupabase } from "@supabase/server";
import type { Database, Json } from "../_shared/database.types.ts";
import { SOCIAL_NETWORKS } from "../_shared/geoapify.ts";
import type { Socials } from "../_shared/geoapify.ts";
import { GOOGLE_PROVIDER, GooglePlacesError, enrichBusiness } from "../_shared/google-places.ts";
import type { GoogleEnrichment } from "../_shared/google-places.ts";
import { checkWebsite, socialsFrom, websiteGaps } from "../_shared/website.ts";
import type { WebsiteCheck } from "../_shared/website.ts";
import { searchSocials } from "../_shared/social-search.ts";

// Runs only when the freelancer approves a candidate (or asks to regenerate).
// It never runs during discovery, so a browse-only session costs no tokens.

type QualifyRequest = { prospectId?: unknown };

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    suggestedService: { type: Type.STRING },
    reason: { type: Type.STRING },
    subject: { type: Type.STRING },
    body: { type: Type.STRING },
  },
  required: ["suggestedService", "reason", "subject", "body"],
};

/**
 * What the business is missing, derived purely from what discovery recorded.
 * These strings are stored as-is; the model may explain them but not add to
 * them. "Not listed" is the honest framing: absence from OpenStreetMap is
 * evidence of a weak web presence, not proof the thing does not exist.
 */
function computeGaps(
  row: { website: string | null; email: string | null; phone: string | null; socials: Socials },
  site: WebsiteCheck | null,
  searched: boolean,
): string[] {
  // Website findings first: a hijacked or dead site outranks everything.
  const gaps: string[] = websiteGaps(site, Boolean(row.website));
  const looked = searched ? "found" : "listed";
  if (!row.socials.facebook) gaps.push(`No Facebook page ${looked}`);
  if (!row.socials.instagram) gaps.push(`No Instagram ${looked}`);
  if (!row.email) gaps.push("No public email");
  if (!row.phone) gaps.push("No phone number listed");
  const hasAnySocial = SOCIAL_NETWORKS.some((network) => row.socials[network]);
  const siteWorks = Boolean(row.website) && site?.reachable && !site.offDomain;
  if (siteWorks && !hasAnySocial) gaps.push("Working website but no social presence");
  if (!row.website && hasAnySocial) gaps.push("Social presence but no website");
  return gaps;
}

const asSocials = (value: Json): Socials =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Socials)
    : {};

export default {
  fetch: withSupabase<Database>({ auth: "user" }, async (request, context) => {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const userId = context.userClaims?.id;
    if (!userId) return json({ error: "Sign in to qualify a prospect" }, 401);

    let body: QualifyRequest;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Request body must be valid JSON" }, 400);
    }
    const prospectId = Number(body.prospectId);
    if (!Number.isSafeInteger(prospectId) || prospectId <= 0) {
      return json({ error: "A prospect id is required" }, 400);
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "Gemini is not configured" }, 503);
    const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash-lite";
    const ai = new GoogleGenAI({ apiKey });

    // RLS scopes both reads to the caller; a foreign id simply returns nothing.
    const [{ data: prospect, error: prospectError }, { data: settings }] =
      await Promise.all([
        context.supabase.from("prospects").select("*").eq("id", prospectId).maybeSingle(),
        context.supabase.from("user_settings").select("service_offers").maybeSingle(),
      ]);
    if (prospectError) return json({ error: "The prospect could not be read" }, 500);
    if (!prospect) return json({ error: "Prospect not found" }, 404);

    // Enrich from Google once. Geoapify's OpenStreetMap data is often blank
    // for small businesses; Google's profile usually has the phone and site
    // the owner entered. Only blanks are filled — a value the freelancer typed
    // is never overwritten. Skipped silently if no key is configured, and a
    // Google failure never blocks qualification.
    const googleKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    const existing = (prospect.enrichment && typeof prospect.enrichment === "object" && !Array.isArray(prospect.enrichment)
      ? prospect.enrichment
      : {}) as Partial<GoogleEnrichment> & { provider?: string; error?: string };
    let enrichment: (GoogleEnrichment & { provider: string }) | null =
      existing.provider === GOOGLE_PROVIDER && existing.placeId
        ? (existing as GoogleEnrichment & { provider: string })
        : null;
    let enrichmentNote = "";

    if (googleKey && !enrichment) {
      try {
        const found = await enrichBusiness(
          { name: prospect.name, location: prospect.location, lat: prospect.lat, lon: prospect.lon },
          googleKey,
        );
        if (found) {
          enrichment = { ...found, provider: GOOGLE_PROVIDER };
          const patch: Database["public"]["Tables"]["prospects"]["Update"] = { enrichment: enrichment as Json };
          if (!prospect.phone && found.phone) patch.phone = found.phone;
          if (!prospect.website && found.website) patch.website = found.website;
          if (!prospect.location && found.address) patch.location = found.address;
          if (!prospect.email && !prospect.phone && found.phone) patch.contact = found.phone;
          const { data: enriched } = await context.supabase
            .from("prospects").update(patch).eq("id", prospectId).select().single();
          if (enriched) Object.assign(prospect, enriched);
          await context.supabase.from("activities").insert({
            user_id: userId, prospect_id: prospectId, kind: "system",
            summary: `Enriched from Google Places: ${[found.phone && "phone", found.website && "website", found.rating !== null && "rating"].filter(Boolean).join(", ") || "no contact fields"}`,
            metadata: { provider: GOOGLE_PROVIDER, place_id: found.placeId, matched_name: found.matchedName },
          });
        } else {
          enrichmentNote = "Google Places had no confident match for this business.";
          await context.supabase.from("prospects")
            .update({ enrichment: { provider: GOOGLE_PROVIDER, error: "no_match", enrichedAt: new Date().toISOString() } })
            .eq("id", prospectId);
        }
      } catch (error) {
        enrichmentNote = error instanceof GooglePlacesError ? error.message : "Google enrichment failed.";
        console.error("google enrichment failed", { name: error instanceof Error ? error.name : "UnknownError" });
      }
    }

    // ---- Evidence pass: visit the website, then look for socials ----
    // Providers only say a website exists. Fetching it tells us whether it
    // works, whether the domain still belongs to them, and which profiles it
    // links to. Nothing here can fail the qualification.
    const priorSocials = asSocials(prospect.socials);
    let site: WebsiteCheck | null = null;
    if (prospect.website) {
      site = await checkWebsite(prospect.website).catch(() => null);
    }
    const socials: Socials = { ...socialsFrom(site), ...priorSocials };
    const socialSource: Record<string, string> = {};
    for (const network of SOCIAL_NETWORKS) {
      if (priorSocials[network]) socialSource[network] = "provider";
      else if (socials[network]) socialSource[network] = "website";
    }

    // Grounded search only when the site and providers gave us nothing to go
    // on. Skipped silently if the key has no grounding allowance (HTTP 429).
    let searched = false;
    let searchNote = "";
    if (!socials.facebook && !socials.instagram && Deno.env.get("SOCIAL_SEARCH") !== "off") {
      try {
        const found = await searchSocials(ai, model, {
          name: prospect.name,
          location: prospect.location,
          category: enrichment?.primaryType ?? prospect.category,
        });
        searched = true;
        for (const network of SOCIAL_NETWORKS) {
          if (!socials[network] && found.socials[network]) {
            socials[network] = found.socials[network];
            socialSource[network] = "search";
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        searchNote = /429|RESOURCE_EXHAUSTED|quota/i.test(message)
          ? "Social search needs a paid Gemini tier; skipped."
          : "Social search failed; skipped.";
      }
    }

    // Persist what we learned so the drawer can show provenance.
    const evidencePatch: Database["public"]["Tables"]["prospects"]["Update"] = {
      socials: socials as Json,
      enrichment: {
        ...(enrichment ?? existing),
        website: site,
        socialSource,
        socialSearch: searched ? "done" : searchNote ? "unavailable" : "skipped",
      } as Json,
    };
    // A hijacked site is worth surfacing in the contact line, not hiding.
    if (site?.offDomain && prospect.contact === prospect.website) {
      evidencePatch.contact = prospect.phone ?? prospect.email ?? "No working contact";
    }
    await context.supabase.from("prospects").update(evidencePatch).eq("id", prospectId);

    const gaps = computeGaps({ ...prospect, socials }, site, searched);
    const offers = settings?.service_offers?.length
      ? settings.service_offers
      : ["Website design and build", "Social media management"];

    const facts = [
      `Business name: ${prospect.name}`,
      `Category: ${prospect.category || "unknown"}`,
      `Location: ${prospect.location || "unknown"}`,
      `Website: ${prospect.website ?? "none listed"}`,
      site
        ? site.offDomain
          ? `Website check: the listed domain now redirects to an unrelated site (${site.finalUrl}) titled "${site.title ?? "?"}". Treat the business as having NO working website; this is the most important finding.`
          : !site.reachable
            ? `Website check: unreachable (${site.status ?? site.error})`
            : `Website check: live, title "${site.title ?? "?"}", https: ${site.https}, mobile-friendly: ${site.hasViewport}`
        : null,
      `Phone: ${prospect.phone ? "listed" : "none listed"}`,
      `Email: ${prospect.email ? "listed" : "none listed"}`,
      `Social profiles ${searched ? "found" : "listed"}: ${
        SOCIAL_NETWORKS.filter((network) => socials[network]).map((network) => `${network} (${socialSource[network]})`).join(", ") || "none"
      }`,
      `Observed gaps: ${gaps.join("; ") || "none"}`,
      enrichment?.rating !== null && enrichment?.rating !== undefined
        ? `Google rating: ${enrichment.rating} from ${enrichment.ratingCount ?? 0} reviews`
        : null,
      enrichment?.businessStatus && enrichment.businessStatus !== "OPERATIONAL"
        ? `Google business status: ${enrichment.businessStatus}`
        : null,
      prospect.notes ? `Freelancer's own notes: ${prospect.notes}` : null,
    ].filter(Boolean).join("\n");

    let parsed: { suggestedService: string; reason: string; subject: string; body: string };
    let usage: { promptTokenCount?: number; candidatesTokenCount?: number } | undefined;
    try {
      const response = await ai.models.generateContent({
        model,
        contents: facts,
        config: {
          responseMimeType: "application/json",
          responseSchema,
          systemInstruction: [
            "You help a freelance web developer and social media manager qualify a local business and write a first outreach message.",
            `The freelancer offers: ${offers.join("; ")}.`,
            "You will receive verified facts about one business. Use ONLY those facts.",
            "Never claim the business has a problem that is not in the observed gaps.",
            "Never praise a website the website check says is redirected or unreachable. If the domain redirects to an unrelated site, lead with that: it is urgent, embarrassing for them, and the strongest reason to talk.",
            "A social profile marked (search) was found by web search, not confirmed by the business; refer to it cautiously.",
            "Never invent people's names, statistics, reviews, competitors, or events.",
            "suggestedService: pick the single most relevant service from the freelancer's offers, matching the observed gaps.",
            "reason: one or two sentences explaining the fit, citing the specific gaps.",
            "subject: a short, specific email subject line (no clickbait, no exclamation marks).",
            "body: a warm, plain-language first message of 90 to 140 words. Mention the business by name. Refer to at most two gaps, framed as an opportunity rather than a criticism. End with one easy question. Sign off with the literal placeholder [Your name] on its own line. No bullet points, no emojis, no pricing.",
            "If there are no observed gaps, say so honestly in the reason and make the message a light introduction instead.",
            "If a Google rating is provided you may mention it once, positively and briefly. Never mention review counts as a weakness.",
          ].join("\n"),
        },
      });
      const text = response.text?.trim();
      if (!text) throw new Error("Gemini returned an empty response");
      parsed = JSON.parse(text);
      usage = response.usageMetadata ?? undefined;
    } catch (error) {
      console.error("qualify-prospect model call failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      return json({ error: "The qualification could not be generated" }, 502);
    }

    const suggestedService = String(parsed.suggestedService ?? "").slice(0, 200);
    const reason = String(parsed.reason ?? "").slice(0, 1000);
    const subject = String(parsed.subject ?? "").slice(0, 200);
    const draftBody = String(parsed.body ?? "").trim().slice(0, 8000);
    if (!draftBody) return json({ error: "The draft came back empty" }, 502);

    const { data: updated, error: updateError } = await context.supabase
      .from("prospects")
      .update({
        service: suggestedService,
        qualification_reason: reason,
        gaps,
        qualified_at: new Date().toISOString(),
      })
      .eq("id", prospectId)
      .select()
      .single();
    if (updateError || !updated) {
      return json({ error: "The qualification could not be saved" }, 500);
    }

    // Each regeneration is a new version; earlier drafts are kept for reference.
    const { data: latest } = await context.supabase
      .from("message_drafts")
      .select("version")
      .eq("prospect_id", prospectId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: draft, error: draftError } = await context.supabase
      .from("message_drafts")
      .insert({
        user_id: userId,
        prospect_id: prospectId,
        kind: "outreach",
        channel: "email",
        subject,
        body: draftBody,
        status: "draft",
        model,
        version: (latest?.version ?? 0) + 1,
      })
      .select()
      .single();
    if (draftError || !draft) return json({ error: "The draft could not be saved" }, 500);

    await Promise.all([
      context.supabase.from("activities").insert({
        user_id: userId,
        prospect_id: prospectId,
        kind: "email_draft",
        summary: `Outreach draft v${draft.version} generated (${suggestedService || "no service chosen"})`,
        metadata: { draft_id: draft.id, gaps },
      }),
      context.supabase.from("ai_usage").insert({
        user_id: userId,
        provider: "gemini",
        model,
        operation: "qualify_prospect",
        input_tokens: usage?.promptTokenCount ?? null,
        output_tokens: usage?.candidatesTokenCount ?? null,
        metadata: { prospect_id: prospectId, draft_id: draft.id },
      }),
    ]);

    return json({
      prospect: updated,
      draft,
      enrichmentNote: [enrichmentNote, searchNote].filter(Boolean).join(" ") || undefined,
    });
  }),
};
