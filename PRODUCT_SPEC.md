# LifeDesk CRM — Product Specification

## Purpose

LifeDesk is a single-user, AI-assisted personal CRM for a freelance web developer and social media manager. It helps discover relevant local businesses, qualify opportunities, manage outreach, and carry relationships from prospect to client.

The first release is intentionally lightweight. It does not perform SEO checks, speed tests, website crawling, accessibility audits, or other technical website analysis.

## Product promise

> Tell LifeDesk what kind of businesses you want to work with, review the prospects it finds, and manage the relationship from first contact to client.

The system should always make the next useful action obvious while keeping the freelancer in control of saved records and outbound communication.

## MVP scope

- Single-user dashboard with today’s follow-ups, review queue, tasks, and pipeline summary.
- Natural-language prospect discovery, translated into editable filters before execution.
- Business discovery by category, area, quantity, business type, service fit, and contactability.
- Candidate review queue with duplicate detection, evidence, confidence, and approve/reject actions.
- Business and contact records with source, verification state, and opt-out status.
- Prospect pipeline: New, Qualified, Contacted, Replied, Meeting, Proposal, Won, with Lost/Archived outcomes.
- AI-assisted outreach drafts, note summaries, task extraction, and next-action suggestions.
- Manual sending or copy/open-in-email workflow; no automatic bulk outreach.
- Client conversion that preserves prospect history.
- Provider usage dashboard, configurable limits, CSV import/export, and manual fallbacks.

## Primary user flow

```text
Describe ideal prospects
        ↓
Review interpreted filters and estimated usage
        ↓
Discover and deduplicate candidates
        ↓
Review sourced facts and AI qualification
        ↓ approve
Save as prospect and optionally enrich contact
        ↓
Draft personalized outreach
        ↓ manual approval/send
Record activity and schedule follow-up
        ↓
Move through pipeline → convert to client
```

## UX principles

- **Action-oriented:** Home answers “what should I do today?” rather than displaying vanity metrics.
- **Review before commitment:** AI can research, classify, summarize, and draft; saving uncertain data, changing important stages, and sending messages require confirmation.
- **Evidence over magic:** Every external fact shows its source, timestamp, and confidence. AI inferences are labeled as suggestions or unknowns.
- **Low friction:** Preserve filters and scroll position, support quick notes and natural-language task entry, autosave drafts, and provide undo for reversible actions.
- **Calm and readable:** Light theme, warm neutral background, white surfaces, restrained indigo/teal accent, compact tables, clear status labels, accessible focus states, and responsive layouts.
- **Quota-aware:** Before a discovery run, show provider, result limit, estimated calls, and allowance. Keep the app usable through manual entry when a provider is unavailable.

## Main screens

### Home

Large prospect command box, follow-ups due, candidates awaiting review, overdue tasks, pipeline summary, recent activity, and usage indicator.

### Prospect discovery/review

Editable interpreted filters, transparent progress, candidate table, and a side panel containing business facts, contacts, suggested service, qualification explanation, sources, confidence, and approve/reject/archive actions.

### Prospects

Filterable table with business, primary contact, stage, suggested service, next action, and last activity. Quick actions include note, task, draft message, stage change, and archive.

### Prospect detail

Activity timeline and composer as the main content; contact information, qualification, sources, tags, and important dates in a supporting panel; prominent “Draft outreach” action.

### Pipeline

Simple board or table by stage. Cards show business, service, value, and next action. Stage changes remain available without drag-and-drop for accessibility.

### Tasks and Clients

Tasks grouped by overdue/today/upcoming/completed. Won prospects become clients while retaining all prior activity, contacts, notes, services, recurring tasks, renewal dates, and referral/testimonial reminders.

## AI behavior and safety

Gemini is used initially for structured filter extraction, qualification, classification, message drafting, summaries, and task/date extraction. Prefer schema-constrained JSON and explicit provider adapters over parsing free-form prose.

Automatic actions: research, deduplication, classification, summaries, drafts, and recommendations.

Approval-required actions: saving candidates, uncertain contact data, inferred tasks, stage changes, outbound messages, loss decisions, and prospect-to-client conversion.

Never fabricate contact information, claim unsupported business problems, bypass restrictions, ignore opt-outs, or send bulk outreach automatically. Public business information should be sent to Gemini only in the minimum form needed; private client notes are excluded by default.

## Data entities

- `user_settings` — service offers, ideal customer preferences, AI/privacy settings, and limits.
- `businesses` — normalized business identity, category, location, links, and lifecycle state.
- `contacts` — people or business contact channels, verification state, confidence, and opt-out state.
- `contact_sources` — provider/source URL, discovered date, and evidence for each contact fact.
- `discovery_runs` and `discovery_candidates` — request filters, provider usage, raw candidates, decisions, and rejection reasons.
- `opportunities` — service fit, qualification, score/confidence, pipeline stage, value, and next action.
- `activities` — calls, messages, meetings, notes, and source metadata in a timeline.
- `tasks` — due dates, status, linked business/client, and reminder details.
- `message_drafts` and `proposals` — generated content, approval state, and version history.
- `clients` — converted opportunity information and ongoing service/retention details.
- `ai_runs` and `provider_usage` — model/provider, operation, timestamps, status, token/cost estimates, and quota events.
- `suppression_entries` — do-not-contact records and reason/source.

## Planned integrations

### Gemini

Initial hosted AI provider for structured reasoning and drafting. Handle quota errors with backoff and a clear retry state. Keep a provider interface so a local model can be added later without changing CRM workflows.

### Google Places

Primary business discovery source. Request only required fields, cache and deduplicate results, preserve source references, and make billing/allowance behavior visible. Discovery should default to five results and avoid unnecessary enrichment calls.

### Hunter

Optional contact finding and verification for approved, high-value candidates only. Do not spend credits on every search result; contact details must show source, date, and verification/confidence.

### Email

MVP may use copy/open-in-email rather than a sending API. Any future provider integration must retain approval, suppression, and activity logging controls.

## Free-tier safeguards

- Default discovery limit of five businesses and capped candidate examination.
- Cache searches and deduplicate before enrichment.
- Separate discovery from contact enrichment; spend Hunter credits only after approval.
- Configurable daily/monthly ceilings per provider and “never exceed free tier” mode.
- Require confirmation before calls that may incur cost.
- Log usage by feature, provider, and run; surface quota errors without losing work.
- Graceful manual entry and CSV import/export when APIs or AI are unavailable.
- Server-side storage of credentials; never expose API keys in the client.

## Future local AI

The laptop with an RTX 4050 and 16 GB RAM can later run a quantized 7B–8B-class model for summarization, classification, drafting, task extraction, and private CRM questions. Implement `AIProvider` with `GeminiProvider` now and reserve `LocalProvider` for a future private mode. Public prospect research can remain on Gemini while sensitive notes and client summaries are routed locally.

## Definition of done for the prototype

A user can configure service offers, request five local prospects in natural language, edit the interpreted filters, review sourced candidates, approve one, create a prospect, draft outreach, record the activity, schedule a follow-up, move it through the pipeline, convert it into a client, and inspect provider usage without website audit features.
