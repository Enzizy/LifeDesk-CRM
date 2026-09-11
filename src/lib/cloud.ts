import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { requireSupabase } from "./supabase";
import type { Database } from "./database.types";
import type { DiscoveryFilters } from "./discovery";

export type AssistantMode = "Discover" | "Draft" | "Organize";

export type AssistantPreview = {
  mode: AssistantMode;
  summary: string;
  requiresConfirmation: boolean;
  interpretedFilters?: DiscoveryFilters;
  missingContext?: string[];
  suggestedActions?: string[];
};

export type DiscoveryCandidate =
  Database["public"]["Tables"]["discovery_candidates"]["Row"];

export type DiscoveryResult = {
  runId: number;
  resolvedLocation: string;
  candidates: DiscoveryCandidate[];
  skippedDuplicates: number;
};

export async function sendMagicLink(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  const { error } = await requireSupabase().auth.signInWithOtp({
    email: normalizedEmail,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onSessionChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  return requireSupabase().auth.onAuthStateChange(callback).data.subscription;
}

/**
 * `functions.invoke` reports a non-2xx response as an opaque error and keeps the
 * body on `error.context`. Our functions always answer with `{ error: string }`,
 * so surface that instead of "Edge Function returned a non-2xx status code".
 */
async function functionError(error: unknown, fallback: string): Promise<Error> {
  const context = (error as { context?: unknown })?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (body && typeof body.error === "string") return new Error(body.error);
    } catch {
      // Fall through to the generic message below.
    }
  }
  return new Error(error instanceof Error && error.message ? error.message : fallback);
}

export async function interpretAssistantCommand(
  command: string,
  mode: AssistantMode,
  defaultLocation = "",
): Promise<AssistantPreview> {
  const normalizedCommand = command.trim();
  if (!normalizedCommand || normalizedCommand.length > 2_000) {
    throw new Error("Command must contain between 1 and 2,000 characters.");
  }

  const { data, error } = await requireSupabase().functions.invoke<{
    data: AssistantPreview;
  }>("assistant-command", {
    body: { command: normalizedCommand, mode, defaultLocation },
  });
  if (error) throw await functionError(error, "The command could not be interpreted.");
  if (!data?.data) throw new Error("Assistant returned an invalid response.");
  return data.data;
}

/**
 * Executes an approved set of filters against Geoapify and stores the results.
 * This is the only call in the app that spends provider credits, so it must be
 * triggered by an explicit user confirmation, never by typing alone.
 */
export async function runDiscovery(
  filters: DiscoveryFilters,
  command = "",
): Promise<DiscoveryResult> {
  if (!filters.location.trim()) {
    throw new Error("Set a location before running a discovery.");
  }

  const { data, error } = await requireSupabase().functions.invoke<DiscoveryResult>(
    "discover-businesses",
    { body: { filters, command } },
  );
  if (error) throw await functionError(error, "The discovery could not be completed.");
  if (!data) throw new Error("Discovery returned an invalid response.");
  return data;
}


export type QualifyResult = {
  prospect: Database["public"]["Tables"]["prospects"]["Row"];
  draft: Database["public"]["Tables"]["message_drafts"]["Row"];
};

/**
 * Asks Gemini to qualify a saved prospect and write a first outreach draft.
 * Only ever called after the user approves a candidate or explicitly asks to
 * regenerate — never during discovery — and the result is stored as a draft
 * for the user to copy, not sent.
 */
export async function qualifyProspect(prospectId: number): Promise<QualifyResult> {
  const { data, error } = await requireSupabase().functions.invoke<QualifyResult>(
    "qualify-prospect",
    { body: { prospectId } },
  );
  if (error) throw await functionError(error, "The prospect could not be qualified.");
  if (!data?.draft) throw new Error("Qualification returned an invalid response.");
  return data;
}
