# LifeDesk CRM

A personal freelancer CRM with a spatial workstation background and glass interface.

## Run locally

```sh
npm install
npm run dev
```

For Supabase, Gemini, database migrations, and Edge Function setup, see [SETUP.md](./SETUP.md).

Open the local address printed by Vite. Keep the same hostname and port when returning to the app: browser storage is specific to that origin.

## Verify and build

```sh
npm run build
```

## Storage

Everything lives in Supabase Postgres, scoped to your account by row-level security. Sign in with a magic link; your prospects, tasks, activity timeline, and discovery candidates then follow you to any browser or computer.

## What is connected

| Piece | State |
| --- | --- |
| Postgres schema, RLS policies, migrations | Connected |
| Magic-link sign-in | Connected |
| Prospects, tasks, activity timeline, settings | Connected |
| Gemini command interpretation | Connected (`assistant-command`) |
| Geoapify business discovery — phone, website, email, socials | Connected (`discover-businesses`) |
| Qualification + tailored outreach draft on approve | Connected (`qualify-prospect`) |
| Drag-and-drop pipeline, dedicated Discover page | Connected |
| Google Places enrichment on approve (phone, website, rating) | Connected (`qualify-prospect`) |
| Automated outreach | Not started — by design |

Business discovery runs on Geoapify's Places and Geocoding APIs. No map is rendered and no Google Maps key is used.

Discovery is deliberately two steps: a command is interpreted into editable filters for free, and only your confirmation spends provider credits. One run costs 2 of Geoapify's 3,000 free daily credits, however many results come back.

Approving a candidate is the only thing that triggers qualification. LifeDesk works out what the business is missing from the facts discovery recorded — no website, no Instagram, no public email — and asks Gemini to phrase the fit and write a first message. The gaps are computed, not generated, so the draft can never claim a problem the business does not visibly have. The draft is stored for you to copy; nothing is sent.

## Importing an older workspace

If you used the browser-storage build, open **Settings** and use *Import from browser storage*. It copies those records into your account and leaves the browser copy untouched, so a failed import can be retried. Importing twice creates duplicates.

## Design preview and screenshots

Every screen can be rendered with fixture data and no backend — useful for design review without signing in. With `npm run dev` running, open `http://localhost:5173/?preview=home` (also `discover`, `prospects`, `pipeline`, `clients`, `tasks`, `signin`, `prospect`, `candidate`; add `&empty=1` for the empty states). It is dev-only and never part of a production build.

`npm run screenshots` captures all of them to `.screenshots/` using the Edge or Chrome already on the machine (no browser download).

## Layout

```
src/
  components/ui.tsx     shared primitives (Icon, Avatar, Badge, Modal, Toast)
  features/             one folder per screen, plus auth and discovery
  hooks/useWorkspace.ts owns every server-backed collection
  lib/                  supabase client, data access, mappers, edge-function calls
  types.ts              domain types the screens work in
supabase/
  functions/            assistant-command, discover-businesses, _shared
  migrations/           schema and RLS
```

See [SETUP.md](./SETUP.md) for keys, migrations, and deployment.

## Design

The base layout is in `src/index.css`; spatial materials are in `src/spatial.css`. The generated workstation background and its generation prompt are in `public/images/`.
