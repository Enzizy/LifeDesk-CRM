// Fixture data for the design preview. Realistic enough to exercise every
// state a screen can be in: long names, missing contact fields, every stage,
// overdue tasks, a qualified prospect with gaps and enrichment. Never imported
// by production code.

import type { CalendarEvent, Candidate, Prospect, Settings, Task } from "../types";
import { initialsFor, toneFor } from "../types";

const at = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString();
const day = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

const prospect = (
  id: number,
  name: string,
  overrides: Partial<Prospect>,
): Prospect => ({
  id,
  name,
  category: "accommodation.hotel",
  location: "Samboan-Barili Road, Barili, Cebu",
  service: "",
  contact: "No contact found",
  email: "",
  phone: "",
  website: "",
  socials: {},
  gaps: [],
  qualifiedAt: "",
  enrichment: null,
  confidence: "Medium",
  reason: "",
  initials: initialsFor(name),
  tone: toneFor(name),
  origin: "discovered",
  sourceRef: "",
  stage: "New",
  next: "",
  value: 0,
  notes: "",
  createdAt: at(3),
  ...overrides,
});

export const settings: Settings = {
  defaultLocation: "Cebu City",
  serviceOffers: ["Website design and build", "Social media management"],
  discoveryLimit: 5,
  currencyCode: "PHP",
};

export const prospects: Prospect[] = [
  prospect(1, "Bellissimo Minolos Resort", {
    stage: "Qualified",
    service: "Social media management",
    phone: "0917 623 0658",
    website: "https://bellissimominolos.com/",
    contact: "0917 623 0658",
    socials: { facebook: "https://facebook.com/bellissimominolos" },
    gaps: ["Website redirects to an unrelated site (gchotelgaya.com)", "No Instagram found", "No public email"],
    qualifiedAt: at(1),
    reason:
      "Has a website and a Facebook page but no Instagram, which is where resort guests look before booking. A managed Instagram presence is the clearest next step.",
    confidence: "High",
    enrichment: {
      provider: "google_places",
      placeId: "ChIJe-SPIADfqzMR-c8s-JPSEtA",
      matchedName: "Bellissimo Minolos Resort",
      mapsUri: "https://maps.google.com/?cid=1",
      rating: 4.4,
      ratingCount: 212,
      businessStatus: "OPERATIONAL",
      primaryType: "Resort hotel",
      enrichedAt: at(1),
      website: {
        reachable: true,
        status: 200,
        finalUrl: "https://gchotelgaya.com/",
        offDomain: true,
        suspicious: true,
        title: "Super88 : Situs Slot Jackpot Terbaru 2026",
        https: true,
        hasViewport: true,
        checkedAt: at(0),
      },
      socialSource: { facebook: "search" },
      socialSearch: "done",
    },
    next: "Send Instagram audit",
    value: 18000,
    createdAt: at(4),
  }),
  prospect(2, "Costa Anita Seaside", {
    stage: "Contacted",
    service: "Website design and build",
    location: "Samboan-Barili Road, Dumanjug, 6035 Cebu",
    phone: "032 555 0142",
    contact: "032 555 0142",
    gaps: ["No website listed", "No Instagram listed", "Social presence but no website"],
    socials: { facebook: "https://facebook.com/costaanita" },
    qualifiedAt: at(2),
    reason: "Active on Facebook with no website of their own; bookings go through a third-party page.",
    confidence: "High",
    next: "Follow up on Thursday",
    value: 45000,
    createdAt: at(6),
  }),
  prospect(3, "Shamrock Pension House", {
    category: "accommodation.guest_house",
    stage: "New",
    next: "Review and qualify",
    createdAt: at(1),
  }),
  prospect(4, "St Peter – Paul Medical Clinic", {
    category: "healthcare.clinic_or_praxis",
    location: "Talamban, Cebu City",
    stage: "Meeting",
    service: "Website design and build",
    email: "info@stpeterpaulclinic.ph",
    contact: "info@stpeterpaulclinic.ph",
    gaps: ["No website listed"],
    qualifiedAt: at(5),
    reason: "Clinic with a public email but no website; patients cannot see hours or services online.",
    next: "Prepare proposal after Tuesday call",
    value: 60000,
    createdAt: at(12),
  }),
  prospect(5, "Cebu Sagrada Corazon Health Services and Diagnostic Center", {
    category: "healthcare.clinic_or_praxis",
    location: "Lahug, Cebu City",
    stage: "Proposal",
    service: "Website design and build",
    phone: "032 233 9000",
    contact: "032 233 9000",
    website: "https://sagradacorazon.ph",
    gaps: ["No Facebook page listed", "No Instagram listed", "Website but no social presence"],
    qualifiedAt: at(8),
    reason: "Established website with no social channels at all.",
    next: "Proposal sent · awaiting reply",
    value: 85000,
    createdAt: at(20),
  }),
  prospect(6, "Kopi Corner Café", {
    category: "catering.cafe",
    location: "IT Park, Cebu City",
    stage: "Won",
    service: "Social media management",
    origin: "manual",
    email: "hello@kopicorner.ph",
    contact: "hello@kopicorner.ph",
    socials: { instagram: "https://instagram.com/kopicorner" },
    next: "Monthly content review",
    value: 12000,
    createdAt: at(40),
  }),
  prospect(7, "Mactan Dive Center", {
    category: "sport.sports_centre",
    location: "Mactan, Lapu-Lapu City",
    stage: "New",
    next: "Review and qualify",
    createdAt: at(2),
  }),
];

const candidate = (
  id: number,
  name: string,
  overrides: Partial<Candidate>,
): Candidate => ({
  id,
  name,
  category: "accommodation.hotel",
  location: "Samboan-Barili Road, Sayaw, Cebu, Philippines",
  phone: "",
  website: "",
  email: "",
  socials: {},
  lat: 10.1,
  lon: 123.5,
  service: "",
  reason: "",
  confidence: "Medium",
  provider: "geoapify",
  createdAt: at(0),
  ...overrides,
});

export const candidates: Candidate[] = [
  candidate(101, "Barili Beach Resort", {
    category: "beach.beach_resort",
    phone: "0922 111 2233",
    website: "https://bariliresort.ph",
    confidence: "High",
  }),
  candidate(102, "Cebeco Aging Storage", { category: "rental.storage" }),
  candidate(103, "Sun & Sand Guest House", {
    category: "accommodation.guest_house",
    socials: { facebook: "https://facebook.com/sunandsandbarili" },
    confidence: "High",
  }),
  candidate(104, "Bellissimo Minolos Lobby", {
    location: "Bellissimo Minolos Lobby, Samboan-Barili Road, Sayaw, Cebu, Philippines",
  }),
  candidate(105, "Mainit Hot Spring Resort", {
    category: "leisure.spa",
    location: "Mainit, Malabuyoc, Cebu",
    email: "book@mainitsprings.ph",
    confidence: "High",
  }),
  candidate(106, "Lola Nena's Carinderia", {
    category: "catering.restaurant",
    location: "Poblacion, Barili, Cebu",
  }),
];

const atTime = (dayOffset: number, hour: number, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
const plusMinutes = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();

const ev = (id: number, title: string, kind: CalendarEvent["kind"], startsAt: string, minutes: number, prospectId: number | null, location = ""): CalendarEvent => ({
  id, prospectId, title, kind, startsAt, endsAt: minutes ? plusMinutes(startsAt, minutes) : "", location, notes: "", createdAt: at(1),
});

export const events: CalendarEvent[] = [
  ev(1, "Intro call", "call", atTime(0, 10, 30), 30, 4, "Phone"),
  ev(2, "Site visit at the resort", "meeting", atTime(0, 15, 0), 90, 1, "Bellissimo Minolos, Barili"),
  ev(3, "Send revised proposal", "deadline", atTime(2, 17, 0), 0, 5),
  ev(4, "Follow up on Facebook page", "follow_up", atTime(3, 9, 0), 15, 2),
  ev(5, "Kopi Corner content review", "meeting", atTime(6, 14, 0), 60, 6, "Google Meet"),
  ev(6, "Proposal walkthrough", "meeting", atTime(6, 16, 0), 60, 5, "Their clinic, Lahug"),
  ev(7, "Dentist demo", "call", atTime(9, 11, 0), 30, null),
  ev(8, "Monthly retainer invoice", "deadline", atTime(14, 12, 0), 0, 6),
  ev(9, "Check in with Shamrock", "follow_up", atTime(-3, 10, 0), 15, 3),
];

export const tasks: Task[] = [
  { id: 1, prospectId: 2, title: "Call Costa Anita about the Facebook page", details: "", due: day(-2), done: false, createdAt: at(4) },
  { id: 2, prospectId: 4, title: "Send clinic website examples", details: "Two or three local clinics", due: day(0), done: false, createdAt: at(3) },
  { id: 3, prospectId: null, title: "Draft September content calendar", details: "", due: day(0), done: false, createdAt: at(1) },
  { id: 4, prospectId: 5, title: "Chase proposal reply", details: "", due: day(3), done: false, createdAt: at(2) },
  { id: 5, prospectId: null, title: "Update portfolio with Kopi Corner work", details: "", due: "", done: false, createdAt: at(9) },
  { id: 6, prospectId: 1, title: "Instagram audit for Bellissimo", details: "", due: day(-5), done: true, createdAt: at(10) },
];
