// Database access for the CRM records. Every function here runs as the signed-in
// user through RLS, so none of them filter by user_id explicitly — the policies
// in supabase/migrations do it. Inserts must still set user_id because the
// with-check policy compares it to auth.uid().

import { requireSupabase } from "./supabase";
import type { Json } from "./database.types";
import {
  toActivity,
  toCandidate,
  toDraft,
  toEvent,
  toProspect,
  toSettings,
  toTask,
} from "./mappers";
import type {
  Activity,
  ActivityKind,
  CalendarEvent,
  Candidate,
  MessageDraft,
  Prospect,
  Settings,
  Stage,
  Task,
} from "../types";
import { eventKindLabel, initialsFor, toneFor } from "../types";
import type { PersistedWorkspace } from "../storage";

async function currentUserId(): Promise<string> {
  const { data, error } = await requireSupabase().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("You are signed out. Sign in again to continue.");
  return data.user.id;
}

/* -------------------------------------------------------------- prospects */

export type ProspectDraft = {
  name: string;
  email: string;
  service: string;
  category: string;
  location: string;
  value: number;
  next: string;
  notes: string;
};

export async function listProspects(): Promise<Prospect[]> {
  const { data, error } = await requireSupabase()
    .from("prospects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toProspect);
}

export async function createProspect(draft: ProspectDraft): Promise<Prospect> {
  const userId = await currentUserId();
  const { data, error } = await requireSupabase()
    .from("prospects")
    .insert({
      user_id: userId,
      name: draft.name,
      category: draft.category,
      location: draft.location,
      service: draft.service,
      contact: draft.email || "No email added",
      email: draft.email || null,
      confidence: "Medium",
      qualification_reason: "Added manually; review the fit before outreach.",
      initials: initialsFor(draft.name),
      tone: toneFor(draft.name),
      source: "manual",
      stage: "New",
      next_action: draft.next || "Review manually",
      estimated_value: draft.value,
      notes: draft.notes,
    })
    .select()
    .single();
  if (error) throw error;
  return toProspect(data);
}

export async function updateProspect(
  id: number,
  draft: ProspectDraft,
): Promise<Prospect> {
  const { data, error } = await requireSupabase()
    .from("prospects")
    .update({
      name: draft.name,
      category: draft.category,
      location: draft.location,
      service: draft.service,
      contact: draft.email || "No email added",
      email: draft.email || null,
      next_action: draft.next,
      estimated_value: draft.value,
      notes: draft.notes,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return toProspect(data);
}

export async function setProspectStage(
  id: number,
  stage: Stage,
  previous: Stage,
  name: string,
): Promise<Prospect> {
  const { data, error } = await requireSupabase()
    .from("prospects")
    .update({ stage })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  // A stage change is a real event in the relationship, so it belongs on the
  // timeline. Failing to log it must not fail the change itself.
  await logActivity(id, "stage_change", `${name} moved from ${previous} to ${stage}`, {
    from: previous,
    to: stage,
  }).catch(() => undefined);
  return toProspect(data);
}

export async function deleteProspect(id: number): Promise<void> {
  const { error } = await requireSupabase().from("prospects").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------- activities */

export async function listActivities(prospectId: number): Promise<Activity[]> {
  const { data, error } = await requireSupabase()
    .from("activities")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toActivity);
}

export async function logActivity(
  prospectId: number,
  kind: ActivityKind,
  summary: string,
  metadata: Record<string, unknown> = {},
): Promise<Activity> {
  const userId = await currentUserId();
  const { data, error } = await requireSupabase()
    .from("activities")
    .insert({
      user_id: userId,
      prospect_id: prospectId,
      kind,
      summary,
      // The generated `Json` type cannot express an open Record, but the column
      // is jsonb with a `jsonb_typeof(metadata) = 'object'` check, which every
      // caller here satisfies.
      metadata: metadata as Json,
    })
    .select()
    .single();
  if (error) throw error;
  return toActivity(data);
}

/* ------------------------------------------------------------------ tasks */

export type TaskDraft = {
  title: string;
  details: string;
  due: string;
  prospectId: number | null;
};

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await requireSupabase()
    .from("tasks")
    .select("*")
    .order("due_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map(toTask);
}

export async function createTask(draft: TaskDraft): Promise<Task> {
  const userId = await currentUserId();
  const { data, error } = await requireSupabase()
    .from("tasks")
    .insert({
      user_id: userId,
      prospect_id: draft.prospectId,
      title: draft.title,
      details: draft.details,
      // A date input gives a bare day; store it as end of that local day so a
      // task due "today" is not already overdue at 00:01.
      due_at: draft.due ? new Date(`${draft.due}T23:59:59`).toISOString() : null,
    })
    .select()
    .single();
  if (error) throw error;
  return toTask(data);
}

export async function setTaskDone(id: number, done: boolean): Promise<Task> {
  const { data, error } = await requireSupabase()
    .from("tasks")
    .update({ completed_at: done ? new Date().toISOString() : null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return toTask(data);
}

export async function deleteTask(id: number): Promise<void> {
  const { error } = await requireSupabase().from("tasks").delete().eq("id", id);
  if (error) throw error;
}

/* ----------------------------------------------------------------- events */

export type EventDraft = {
  title: string;
  kind: CalendarEvent["kind"];
  startsAt: string;
  endsAt: string;
  location: string;
  notes: string;
  prospectId: number | null;
};

export async function listEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await requireSupabase()
    .from("events")
    .select("*")
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toEvent);
}

const whenLabel = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

export async function createEvent(draft: EventDraft, prospectName?: string): Promise<CalendarEvent> {
  const userId = await currentUserId();
  const { data, error } = await requireSupabase()
    .from("events")
    .insert({
      user_id: userId,
      prospect_id: draft.prospectId,
      title: draft.title,
      kind: draft.kind,
      starts_at: draft.startsAt,
      ends_at: draft.endsAt || null,
      location: draft.location,
      notes: draft.notes,
    })
    .select()
    .single();
  if (error) throw error;
  const event = toEvent(data);
  // Scheduling something with a prospect belongs on their timeline. A logging
  // failure must not undo the event.
  if (draft.prospectId) {
    const withWhom = prospectName ? " with " + prospectName : "";
    await logActivity(
      draft.prospectId,
      "meeting",
      eventKindLabel(draft.kind) + " scheduled" + withWhom + ": " + draft.title + " · " + whenLabel(draft.startsAt),
      { event_id: event.id, kind: draft.kind, starts_at: draft.startsAt },
    ).catch(() => undefined);
  }
  return event;
}

export async function updateEvent(id: number, draft: EventDraft): Promise<CalendarEvent> {
  const { data, error } = await requireSupabase()
    .from("events")
    .update({
      prospect_id: draft.prospectId,
      title: draft.title,
      kind: draft.kind,
      starts_at: draft.startsAt,
      ends_at: draft.endsAt || null,
      location: draft.location,
      notes: draft.notes,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return toEvent(data);
}

/**
 * Moves an event to another day, keeping its time of day and duration. Used
 * by drag-to-reschedule on the calendar after the user confirms.
 */
export async function rescheduleEvent(
  event: CalendarEvent,
  newStartsAt: string,
  prospectName?: string,
): Promise<CalendarEvent> {
  const duration = event.endsAt
    ? new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime()
    : 0;
  const { data, error } = await requireSupabase()
    .from("events")
    .update({
      starts_at: newStartsAt,
      ends_at: duration ? new Date(new Date(newStartsAt).getTime() + duration).toISOString() : null,
    })
    .eq("id", event.id)
    .select()
    .single();
  if (error) throw error;
  if (event.prospectId) {
    const withWhom = prospectName ? " with " + prospectName : "";
    await logActivity(
      event.prospectId,
      "meeting",
      eventKindLabel(event.kind) + " rescheduled" + withWhom + ": " + event.title + " · " + whenLabel(event.startsAt) + " → " + whenLabel(newStartsAt),
      { event_id: event.id, from: event.startsAt, to: newStartsAt },
    ).catch(() => undefined);
  }
  return toEvent(data);
}

export async function deleteEvent(id: number): Promise<void> {
  const { error } = await requireSupabase().from("events").delete().eq("id", id);
  if (error) throw error;
}

/* --------------------------------------------------------------- settings */

export async function getSettings(): Promise<Settings> {
  const { data, error } = await requireSupabase()
    .from("user_settings")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return toSettings(data);
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  const userId = await currentUserId();
  const { data, error } = await requireSupabase()
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        default_location: settings.defaultLocation,
        service_offers: settings.serviceOffers,
        discovery_limit: settings.discoveryLimit,
        currency_code: settings.currencyCode,
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();
  if (error) throw error;
  return toSettings(data);
}

/* ------------------------------------------------------------- candidates */

export async function listPendingCandidates(): Promise<Candidate[]> {
  const { data, error } = await requireSupabase()
    .from("discovery_candidates")
    .select("*")
    .eq("review_status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toCandidate);
}

async function setCandidateStatus(
  id: number,
  status: "approved" | "archived" | "rejected" | "pending",
): Promise<void> {
  const { error } = await requireSupabase()
    .from("discovery_candidates")
    .update({
      review_status: status,
      reviewed_at: status === "pending" ? null : new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export const archiveCandidate = (id: number) => setCandidateStatus(id, "archived");
export const restoreCandidate = (id: number) => setCandidateStatus(id, "pending");

/**
 * Approving a candidate creates the prospect, records why it exists, and only
 * then marks the candidate reviewed. If the prospect insert fails the candidate
 * stays pending, so nothing is lost.
 */
export async function approveCandidate(
  candidate: Candidate,
  contact: string,
): Promise<Prospect> {
  const userId = await currentUserId();
  const { data, error } = await requireSupabase()
    .from("prospects")
    .insert({
      user_id: userId,
      name: candidate.name,
      category: candidate.category,
      location: candidate.location,
      service: candidate.service,
      contact: contact || "No contact found",
      email: candidate.email || null,
      phone: candidate.phone || null,
      website: candidate.website || null,
      socials: candidate.socials as Json,
      lat: candidate.lat,
      lon: candidate.lon,
      confidence: candidate.confidence,
      qualification_reason: candidate.reason,
      initials: initialsFor(candidate.name),
      tone: toneFor(candidate.name),
      source: "discovered",
      source_ref: candidate.website || null,
      stage: "New",
      next_action: "Review and qualify",
      estimated_value: 0,
      notes: "",
      discovered_at: candidate.createdAt,
    })
    .select()
    .single();
  if (error) throw error;

  const prospect = toProspect(data);
  await logActivity(
    prospect.id,
    "system",
    `Saved from ${candidate.provider} discovery`,
    { provider: candidate.provider, candidate_id: candidate.id },
  ).catch(() => undefined);
  await setCandidateStatus(candidate.id, "approved");
  return prospect;
}

export async function undoApproval(
  prospectId: number,
  candidateId: number,
): Promise<void> {
  await deleteProspect(prospectId);
  await setCandidateStatus(candidateId, "pending");
}

/* ----------------------------------------------------------------- drafts */

export async function listDrafts(prospectId: number): Promise<MessageDraft[]> {
  const { data, error } = await requireSupabase()
    .from("message_drafts")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("version", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toDraft);
}

export async function setDraftStatus(
  id: number,
  status: MessageDraft["status"],
): Promise<void> {
  const { error } = await requireSupabase()
    .from("message_drafts")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Records that the freelancer sent a draft through their own channel. LifeDesk
 * never sends anything itself; this is the audit trail of a manual action.
 */
export async function markDraftSent(draft: MessageDraft, name: string): Promise<void> {
  await setDraftStatus(draft.id, "sent");
  await logActivity(
    draft.prospectId,
    "outreach",
    `Sent outreach to ${name}: "${draft.subject || "(no subject)"}"`,
    { draft_id: draft.id, channel: draft.channel },
  );
}

/* ------------------------------------------------------- one-time import */

export type ImportSummary = { prospects: number; tasks: number };

type LegacyRecord = Record<string, unknown>;
const str = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

/**
 * Moves a workspace saved by the browser-storage build into Postgres. Runs only
 * when the user asks: it is additive, never destructive, and the local copy is
 * left in place so a failed import can be retried.
 */
export async function importLegacyWorkspace(
  workspace: PersistedWorkspace,
): Promise<ImportSummary> {
  const userId = await currentUserId();
  const supabase = requireSupabase();
  const summary: ImportSummary = { prospects: 0, tasks: 0 };

  const prospectRows = (workspace.prospects as LegacyRecord[])
    .filter((record) => record && typeof record === "object" && str(record.name).trim())
    .map((record) => {
      const name = str(record.name).trim().slice(0, 200);
      const email = str(record.email) || (str(record.contact).includes("@") ? str(record.contact) : "");
      return {
        user_id: userId,
        name,
        category: str(record.category),
        location: str(record.location),
        service: str(record.service),
        contact: str(record.contact, "No email added"),
        email: email || null,
        confidence: record.confidence === "High" ? "High" : "Medium",
        qualification_reason: str(record.reason),
        initials: str(record.initials) || initialsFor(name),
        tone: str(record.tone, toneFor(name)),
        source: record.origin === "discovered" ? "discovered" : "manual",
        stage: str(record.stage, "New"),
        next_action: str(record.next),
        // Legacy values were display strings such as "S$1,800".
        estimated_value: Number(str(record.value).replace(/[^0-9.]/g, "")) || 0,
        notes: str(record.notes),
      };
    });

  if (prospectRows.length) {
    const { data, error } = await supabase.from("prospects").insert(prospectRows).select("id");
    if (error) throw error;
    summary.prospects = data?.length ?? 0;
  }

  const taskRows = (workspace.tasks as LegacyRecord[])
    .filter((record) => record && typeof record === "object" && str(record.title).trim())
    .map((record) => {
      const due = str(record.due);
      return {
        user_id: userId,
        prospect_id: null,
        title: str(record.title).trim().slice(0, 500),
        details: str(record.meta),
        due_at: due ? new Date(`${due}T23:59:59`).toISOString() : null,
        completed_at: record.done === true ? new Date().toISOString() : null,
      };
    });

  if (taskRows.length) {
    const { data, error } = await supabase.from("tasks").insert(taskRows).select("id");
    if (error) throw error;
    summary.tasks = data?.length ?? 0;
  }

  return summary;
}
