-- Approved prospects are enriched once from Google Places (New). The result is
-- kept whole so the UI can show provenance (which provider said what, when)
-- and so a later re-qualification does not need a second paid call.

alter table public.prospects
  add column enrichment jsonb not null default '{}'::jsonb
    check (jsonb_typeof(enrichment) = 'object'),
  add column lat double precision,
  add column lon double precision;

-- Candidates already carry lat/lon inside source_payload; surface them as
-- columns so approval can copy them without parsing JSON in the browser.
alter table public.discovery_candidates
  add column lat double precision,
  add column lon double precision;

update public.discovery_candidates
set
  lat = nullif(source_payload ->> 'lat', '')::double precision,
  lon = nullif(source_payload ->> 'lon', '')::double precision
where source_payload ? 'lat';
