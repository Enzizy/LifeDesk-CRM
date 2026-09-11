# LifeDesk CRM setup

## Prerequisites

- Node.js (with npm)
- Docker Desktop (required only for the local Supabase stack)
- A Supabase account and the Supabase CLI (`npx supabase ...` works with this repository)

The hosted Supabase project for this app has project ref `crrkxxewmcmvyujiddbg`.

## Environment files

Copy the browser-safe template and fill in the two values from Supabase Dashboard → **Connect**:

```sh
cp .env.example .env.local
```

```dotenv
VITE_SUPABASE_URL=https://crrkxxewmcmvyujiddbg.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

For Edge Functions, copy the server-only template instead:

```sh
cp supabase/functions/.env.example supabase/functions/.env.local
```

Set `GEMINI_API_KEY` and `GEOAPIFY_API_KEY` in that file. Keep it server-only: it is read by the function emulator and is ignored by Git. Nothing outside `VITE_*` in `.env.local` is ever sent to the browser.

### Geoapify key

Geoapify replaces Google Maps for both geocoding and business discovery. Sign up at
[myprojects.geoapify.com](https://myprojects.geoapify.com/), create a project, and copy its
API key into `GEOAPIFY_API_KEY`.

- No credit card is required, and the free tier allows 3,000 credits per day.
- LifeDesk uses the Places and Geocoding APIs only. No map tiles are rendered, so the
  spatial desk UI is unchanged.
- One discovery run costs two credits: one geocode plus one Places search, regardless of
  how many businesses come back. The result limit defaults to 5 and is capped at 25.

## Connect and apply the database

Authenticate the CLI, link this checkout to the hosted project, and push migrations:

```sh
npx supabase login
npx supabase link --project-ref crrkxxewmcmvyujiddbg
npx supabase db push
```

Generate TypeScript types from the linked database (choose or create the destination used by the app):

```sh
npx supabase gen types typescript --linked > src/lib/database.types.ts
```

## Local Supabase (Docker)

Start the local database and services from the repository root:

```sh
npx supabase start
npx supabase status
npm install
npm run dev
```

Apply migrations to the local database with `npx supabase db reset` when you need a clean local schema. Stop the containers when finished with `npx supabase stop`.

## Edge Functions

Three functions make up the discovery flow, matching the spec's "review before commitment"
rule — interpreting a command costs nothing and saves nothing; only the second call spends
Geoapify credits, and only after the user approves the filters.

| Function | Provider | Purpose |
| --- | --- | --- |
| `assistant-command` | Gemini | Turns a natural-language command into editable, schema-constrained filters. Writes `ai_usage`. |
| `discover-businesses` | Geoapify | Runs approved filters, deduplicates, and stores `discovery_runs` + `discovery_candidates` including phone, website, email, and social profiles. |
| `qualify-prospect` | Gemini | Runs only when you approve a candidate (or ask to regenerate). Computes what the business lacks from recorded facts, picks a service, and writes an outreach draft into `message_drafts`. Never sends anything. |

Run them locally with their server-only secrets:

```sh
npm run functions:serve
```

Typecheck them before deploying (requires Deno):

```sh
npm run functions:check
```

Deploy both, then upload the same secrets to the project (the local env file is not
deployed automatically):

```sh
npm run functions:deploy
npx supabase secrets set --project-ref crrkxxewmcmvyujiddbg --env-file supabase/functions/.env.local
```

### Shared code

`supabase/functions/_shared/` holds the Geoapify adapter (category allowlist, geocoding,
Places search, normalization) and a copy of the generated database types. `supabase
functions deploy` only bundles files under `supabase/`, so the functions cannot import
`src/lib/database.types.ts` directly — `npm run supabase:types` regenerates it and mirrors
it into `_shared/` automatically.

## Codex Supabase MCP (optional)

Add and authenticate the Supabase MCP server, then use `/mcp` in Codex to verify it:

```sh
codex mcp add supabase --url "https://mcp.supabase.com/mcp?project_ref=crrkxxewmcmvyujiddbg&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching"
codex mcp login supabase
```

Agent Skills are optional:

```sh
npx skills add supabase/agent-skills
```

Never commit or expose `service_role`, Supabase secret keys, `GEMINI_API_KEY`, or `GEOAPIFY_API_KEY`. Only the Supabase URL and publishable key belong in Vite's `VITE_*` browser environment.
