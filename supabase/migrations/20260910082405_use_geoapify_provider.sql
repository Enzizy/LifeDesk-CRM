alter table public.discovery_runs
  alter column provider set default 'geoapify';

alter table public.discovery_candidates
  alter column provider set default 'geoapify';
