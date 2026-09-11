// Row <-> domain conversion. Database columns are permissive (text with check
// constraints, nullable contact fields); the UI types are not. Every narrowing
// happens here, once, so a stray value from the database can never widen a
// union the screens rely on.

import type { Database } from "./database.types";
import type {
  Activity,
  ActivityKind,
  CalendarEvent,
  Candidate,
  EventKind,
  Confidence,
  Enrichment,
  MessageDraft,
  Origin,
  Prospect,
  Settings,
  Socials,
  Stage,
  Task,
  Tone,
} from "../types";
import { STAGES, TONES } from "../types";

type Tables = Database["public"]["Tables"];
export type ProspectRow = Tables["prospects"]["Row"];
export type TaskRow = Tables["tasks"]["Row"];
export type ActivityRow = Tables["activities"]["Row"];
export type CandidateRow = Tables["discovery_candidates"]["Row"];
export type SettingsRow = Tables["user_settings"]["Row"];
export type DraftRow = Tables["message_drafts"]["Row"];
export type EventRow = Tables["events"]["Row"];

const ACTIVITY_KINDS: ActivityKind[] = [
  "note",
  "stage_change",
  "email_draft",
  "outreach",
  "task",
  "meeting",
  "system",
];
const EVENT_KIND_IDS: EventKind[] = ["meeting", "call", "follow_up", "deadline", "other"];

const asStage = (value: string): Stage =>
  STAGES.includes(value as Stage) ? (value as Stage) : "New";
const asTone = (value: string): Tone =>
  TONES.includes(value as Tone) ? (value as Tone) : "lilac";
const asConfidence = (value: string): Confidence =>
  value === "High" ? "High" : "Medium";
const asOrigin = (value: string): Origin =>
  value === "discovered" ? "discovered" : "manual";
const asSocials = (value: unknown): Socials =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(
        Object.entries(value as Record<string, unknown>).filter(
          ([, url]) => typeof url === "string" && url,
        ),
      )
    : {};
const asEnrichment = (value: unknown): Enrichment | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const e = value as Record<string, unknown>;
  if (typeof e.placeId !== "string" || !e.placeId) return null;
  return {
    provider: typeof e.provider === "string" ? e.provider : "google_places",
    placeId: e.placeId,
    matchedName: typeof e.matchedName === "string" ? e.matchedName : "",
    mapsUri: typeof e.mapsUri === "string" ? e.mapsUri : "",
    rating: typeof e.rating === "number" ? e.rating : null,
    ratingCount: typeof e.ratingCount === "number" ? e.ratingCount : null,
    businessStatus: typeof e.businessStatus === "string" ? e.businessStatus : "",
    primaryType: typeof e.primaryType === "string" ? e.primaryType : "",
    enrichedAt: typeof e.enrichedAt === "string" ? e.enrichedAt : "",
  };
};
const asKind = (value: string): ActivityKind =>
  ACTIVITY_KINDS.includes(value as ActivityKind)
    ? (value as ActivityKind)
    : "system";

export function toProspect(row: ProspectRow): Prospect {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    location: row.location,
    service: row.service,
    contact: row.contact,
    email: row.email ?? "",
    phone: row.phone ?? "",
    website: row.website ?? "",
    socials: asSocials(row.socials),
    gaps: Array.isArray(row.gaps) ? row.gaps : [],
    qualifiedAt: row.qualified_at ?? "",
    enrichment: asEnrichment(row.enrichment),
    confidence: asConfidence(row.confidence),
    reason: row.qualification_reason,
    initials: row.initials,
    tone: asTone(row.tone),
    origin: asOrigin(row.source),
    sourceRef: row.source_ref ?? "",
    stage: asStage(row.stage),
    next: row.next_action,
    // PostgREST returns numeric as a JSON number, but guard anyway: a string
    // here would silently make every pipeline total NaN.
    value: Number(row.estimated_value) || 0,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    prospectId: row.prospect_id,
    title: row.title,
    details: row.details,
    due: row.due_at ? row.due_at.slice(0, 10) : "",
    done: row.completed_at !== null,
    createdAt: row.created_at,
  };
}

export function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    prospectId: row.prospect_id,
    kind: asKind(row.kind),
    summary: row.summary,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: row.created_at,
  };
}

export function toCandidate(row: CandidateRow): Candidate {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    location: row.location,
    phone: row.phone ?? "",
    website: row.website ?? "",
    email: row.email ?? "",
    socials: asSocials(row.socials),
    lat: row.lat,
    lon: row.lon,
    service: row.suggested_service,
    reason: row.qualification_reason,
    confidence: asConfidence(row.confidence),
    provider: row.provider,
    createdAt: row.created_at,
  };
}

export function toSettings(row: SettingsRow | null): Settings {
  return {
    defaultLocation: row?.default_location ?? "",
    serviceOffers: row?.service_offers ?? [],
    discoveryLimit: row?.discovery_limit ?? 5,
    currencyCode: row?.currency_code ?? "PHP",
  };
}

export function toEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    prospectId: row.prospect_id,
    title: row.title,
    kind: EVENT_KIND_IDS.includes(row.kind as EventKind) ? (row.kind as EventKind) : "other",
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? "",
    location: row.location,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function toDraft(row: DraftRow): MessageDraft {
  const status = row.status;
  return {
    id: row.id,
    prospectId: row.prospect_id,
    kind: row.kind,
    channel: row.channel,
    subject: row.subject,
    body: row.body,
    status:
      status === "approved" || status === "sent" || status === "discarded"
        ? status
        : "draft",
    model: row.model ?? "",
    version: row.version,
    createdAt: row.created_at,
  };
}

/**
 * The best contact line we can show without inventing anything: a discovered
 * candidate may have an email, a phone, a website, or none of the three.
 */
export function contactLine(candidate: {
  email: string;
  phone: string;
  website: string;
  socials: Socials;
}): string {
  return (
    candidate.email ||
    candidate.phone ||
    candidate.website ||
    Object.values(candidate.socials)[0] ||
    "No contact found"
  );
}
