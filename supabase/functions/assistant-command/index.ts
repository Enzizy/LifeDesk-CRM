import "@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenAI, Type } from "@google/genai";
import { withSupabase } from "@supabase/server";
import type { Database } from "../_shared/database.types.ts";
import {
  ALLOWED_CATEGORIES,
  DEFAULT_RADIUS_METERS,
  DEFAULT_RESULT_LIMIT,
  MAX_RADIUS_METERS,
  MAX_RESULT_LIMIT,
  sanitizeCategories,
} from "../_shared/geoapify.ts";

type CommandMode = "Discover" | "Draft" | "Organize";
type CommandRequest = { command?: unknown; mode?: unknown; defaultLocation?: unknown };

const allowedModes = new Set<CommandMode>(["Discover", "Draft", "Organize"]);
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

// Schema-constrained output: the model fills a fixed shape rather than prose
// that would have to be parsed. `interpretedFilters` deliberately mirrors the
// Geoapify request the user will approve on the next step.
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    mode: { type: Type.STRING, enum: ["Discover", "Draft", "Organize"] },
    summary: { type: Type.STRING },
    requiresConfirmation: { type: Type.BOOLEAN },
    interpretedFilters: {
      type: Type.OBJECT,
      properties: {
        location: { type: Type.STRING },
        categories: {
          type: Type.ARRAY,
          items: { type: Type.STRING, enum: [...ALLOWED_CATEGORIES] },
        },
        radiusMeters: { type: Type.INTEGER },
        limit: { type: Type.INTEGER },
        nameContains: { type: Type.STRING },
      },
      required: ["location", "categories", "radiusMeters", "limit"],
    },
    missingContext: { type: Type.ARRAY, items: { type: Type.STRING } },
    suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["mode", "summary", "requiresConfirmation", "suggestedActions"],
};

const clampInteger = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
};

/**
 * The model's filter suggestion is untrusted input. Re-validate it here so an
 * invented category or an oversized limit can never reach Geoapify, even if the
 * browser forwards the preview unchanged.
 */
function normalizeInterpretedFilters(value: unknown, fallbackLocation: string) {
  const source = (typeof value === "object" && value !== null ? value : {}) as
    Record<string, unknown>;
  const location = typeof source.location === "string" && source.location.trim()
    ? source.location.trim().slice(0, 200)
    : fallbackLocation;
  const nameContains = typeof source.nameContains === "string" && source.nameContains.trim()
    ? source.nameContains.trim().slice(0, 100)
    : undefined;

  return {
    location,
    categories: sanitizeCategories(source.categories),
    radiusMeters: clampInteger(source.radiusMeters, DEFAULT_RADIUS_METERS, 500, MAX_RADIUS_METERS),
    limit: clampInteger(source.limit, DEFAULT_RESULT_LIMIT, 1, MAX_RESULT_LIMIT),
    ...(nameContains ? { nameContains } : {}),
  };
}

export default {
  fetch: withSupabase<Database>({ auth: "user" }, async (request, context) => {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

    let body: CommandRequest;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Request body must be valid JSON" }, 400);
    }

    const command = typeof body.command === "string" ? body.command.trim() : "";
    const mode = allowedModes.has(body.mode as CommandMode)
      ? (body.mode as CommandMode)
      : "Discover";
    const defaultLocation = typeof body.defaultLocation === "string"
      ? body.defaultLocation.trim().slice(0, 200)
      : "";
    if (!command || command.length > 2_000) {
      return json({ error: "Command must contain between 1 and 2,000 characters" }, 400);
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "Gemini is not configured" }, 503);

    const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash-lite";
    const ai = new GoogleGenAI({ apiKey });

    try {
      const response = await ai.models.generateContent({
        model,
        contents: command,
        config: {
          responseMimeType: "application/json",
          responseSchema,
          systemInstruction: [
            "You are the command interpreter for LifeDesk, a personal freelancer CRM.",
            `The requested mode is ${mode}.`,
            "You only interpret the request into structured filters. You never execute it.",
            "Do not claim to have searched, contacted, saved, or changed anything.",
            "Do not invent business names, contact details, sources, or completed actions.",
            "For Discover, fill interpretedFilters. Business discovery runs on Geoapify Places:",
            "- location: a free-text place Geoapify can geocode, such as a district, city, or address.",
            defaultLocation
              ? `- If the command names no location, use "${defaultLocation}".`
              : "- If the command names no location, leave location empty and list it in missingContext.",
            "- categories: choose only from the provided enum. Pick the narrowest categories that match.",
            `- limit: default ${DEFAULT_RESULT_LIMIT}, never above ${MAX_RESULT_LIMIT}.`,
            `- radiusMeters: default ${DEFAULT_RADIUS_METERS}, never above ${MAX_RADIUS_METERS}.`,
            "- nameContains: only when the user named a specific business.",
            "For Draft, return a draft goal and missing context, not a fabricated recipient.",
            "For Organize, return proposed CRM actions that require user confirmation.",
            "Every mode requires user confirmation before anything is saved or sent.",
          ].join("\n"),
        },
      });

      const text = response.text?.trim();
      if (!text) throw new Error("Gemini returned an empty response");
      const parsed = JSON.parse(text) as Record<string, unknown>;

      const result = {
        ...parsed,
        mode,
        requiresConfirmation: true,
        ...(mode === "Discover"
          ? {
              interpretedFilters: normalizeInterpretedFilters(
                parsed.interpretedFilters,
                defaultLocation,
              ),
            }
          : {}),
      };

      const userId = context.userClaims?.id;
      if (userId) {
        const usage = response.usageMetadata;
        await context.supabase.from("ai_usage").insert({
          user_id: userId,
          provider: "gemini",
          model,
          operation: `command_${mode.toLowerCase()}`,
          input_tokens: usage?.promptTokenCount ?? null,
          output_tokens: usage?.candidatesTokenCount ?? null,
          metadata: { preview_only: true },
        });
      }

      return json({ data: result });
    } catch (error) {
      console.error("assistant-command failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      return json({ error: "The command could not be interpreted" }, 502);
    }
  }),
};
