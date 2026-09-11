// Domain types shared across features. These are the shapes the UI works in;
// src/lib/mappers.ts converts them to and from the database rows, so no screen
// has to know about column names or nullable columns.

export type Tone = "lilac" | "mint" | "peach" | "sky" | "yellow";
export type Stage =
  | "New"
  | "Qualified"
  | "Contacted"
  | "Meeting"
  | "Proposal"
  | "Won";
export type Confidence = "High" | "Medium";
export type Origin = "manual" | "discovered";

export const STAGES: Stage[] = [
  "New",
  "Qualified",
  "Contacted",
  "Meeting",
  "Proposal",
  "Won",
];
export const TONES: Tone[] = ["lilac", "mint", "peach", "sky", "yellow"];

export const SOCIAL_NETWORKS = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "twitter",
  "linkedin",
] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];
export type Socials = Partial<Record<SocialNetwork, string>>;

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X",
  linkedin: "LinkedIn",
};

export type Prospect = {
  id: number;
  name: string;
  category: string;
  location: string;
  service: string;
  contact: string;
  email: string;
  phone: string;
  website: string;
  socials: Socials;
  gaps: string[];
  qualifiedAt: string;
  enrichment: Enrichment | null;
  confidence: Confidence;
  reason: string;
  initials: string;
  tone: Tone;
  origin: Origin;
  sourceRef: string;
  stage: Stage;
  next: string;
  value: number;
  notes: string;
  createdAt: string;
};

/** What Google Places returned for an approved prospect, kept for provenance. */
export type Enrichment = {
  provider: string;
  placeId: string;
  matchedName: string;
  mapsUri: string;
  rating: number | null;
  ratingCount: number | null;
  businessStatus: string;
  primaryType: string;
  enrichedAt: string;
};

export type MessageDraft = {
  id: number;
  prospectId: number;
  kind: string;
  channel: string;
  subject: string;
  body: string;
  status: "draft" | "approved" | "sent" | "discarded";
  model: string;
  version: number;
  createdAt: string;
};

export type Task = {
  id: number;
  prospectId: number | null;
  title: string;
  details: string;
  due: string;
  done: boolean;
  createdAt: string;
};

export type ActivityKind =
  | "note"
  | "stage_change"
  | "email_draft"
  | "outreach"
  | "task"
  | "meeting"
  | "system";

export type EventKind = "meeting" | "call" | "follow_up" | "deadline" | "other";
export const EVENT_KINDS: { id: EventKind; label: string }[] = [
  { id: "meeting", label: "Meeting" },
  { id: "call", label: "Call" },
  { id: "follow_up", label: "Follow-up" },
  { id: "deadline", label: "Deadline" },
  { id: "other", label: "Other" },
];
export const eventKindLabel = (kind: EventKind): string =>
  EVENT_KINDS.find((entry) => entry.id === kind)?.label ?? "Event";

export type CalendarEvent = {
  id: number;
  prospectId: number | null;
  title: string;
  kind: EventKind;
  /** ISO timestamps. */
  startsAt: string;
  endsAt: string;
  location: string;
  notes: string;
  createdAt: string;
};

export type Activity = {
  id: number;
  prospectId: number;
  kind: ActivityKind;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type Candidate = {
  id: number;
  name: string;
  category: string;
  location: string;
  phone: string;
  website: string;
  email: string;
  socials: Socials;
  lat: number | null;
  lon: number | null;
  service: string;
  reason: string;
  confidence: Confidence;
  provider: string;
  createdAt: string;
};

export type Settings = {
  defaultLocation: string;
  serviceOffers: string[];
  discoveryLimit: number;
  currencyCode: string;
};

/** "1 business", "3 businesses". Pass an explicit plural for irregulars. */
export const plural = (count: number, singular: string, pluralForm = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : pluralForm}`;

export const initialsFor = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

/**
 * Deterministic avatar tone: the same business always gets the same colour,
 * across devices and reloads. The previous build used `Date.now() % 5`, which
 * changed every time a record was recreated.
 */
export const toneFor = (seed: string): Tone => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return TONES[hash % TONES.length];
};

/**
 * Formats an estimated value in the workspace currency. Falls back to a plain
 * code prefix if Intl does not know the code, rather than throwing mid-render.
 */
export const formatValue = (value: number, currencyCode = "PHP"): string => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(Math.round(value));
  } catch {
    return `${currencyCode} ${Math.round(value).toLocaleString()}`;
  }
};
