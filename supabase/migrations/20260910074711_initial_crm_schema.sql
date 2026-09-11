create table public.prospects (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  category text not null default '',
  location text not null default '',
  service text not null default '',
  contact text not null default '',
  email text,
  confidence text not null default 'Medium'
    check (confidence in ('High', 'Medium')),
  qualification_reason text not null default '',
  initials text not null default ''
    check (char_length(initials) <= 3),
  tone text not null default 'lilac'
    check (tone in ('lilac', 'mint', 'peach', 'sky', 'yellow')),
  source text not null default 'manual'
    check (source in ('manual', 'discovered')),
  source_ref text,
  stage text not null default 'New'
    check (stage in ('New', 'Qualified', 'Contacted', 'Meeting', 'Proposal', 'Won')),
  next_action text not null default '',
  estimated_value numeric(12, 2) not null default 0
    check (estimated_value >= 0),
  notes text not null default '',
  discovered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.tasks (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  prospect_id bigint,
  title text not null check (char_length(btrim(title)) between 1 and 500),
  details text not null default '',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (completed_at is null or completed_at >= created_at),
  foreign key (user_id, prospect_id)
    references public.prospects (user_id, id)
    on delete set null (prospect_id)
);

create table public.activities (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  prospect_id bigint not null,
  kind text not null
    check (kind in ('note', 'stage_change', 'email_draft', 'outreach', 'task', 'system')),
  summary text not null check (char_length(btrim(summary)) between 1 and 1000),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (user_id, prospect_id)
    references public.prospects (user_id, id)
    on delete cascade
);

create table public.discovery_runs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  command text not null check (char_length(btrim(command)) between 1 and 2000),
  provider text not null default 'google_places'
    check (char_length(btrim(provider)) between 1 and 100),
  interpreted_filters jsonb not null default '{}'::jsonb
    check (jsonb_typeof(interpreted_filters) = 'object'),
  result_limit smallint not null default 5 check (result_limit between 1 and 25),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'partial', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (completed_at is null or completed_at >= created_at),
  unique (user_id, id, provider)
);

create table public.discovery_candidates (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  discovery_run_id bigint not null,
  provider text not null default 'google_places'
    check (char_length(btrim(provider)) between 1 and 100),
  provider_place_id text,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  category text not null default '',
  location text not null default '',
  phone text,
  website text,
  email text,
  suggested_service text not null default '',
  qualification_reason text not null default '',
  confidence text not null default 'Medium'
    check (confidence in ('High', 'Medium')),
  source_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(source_payload) = 'object'),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'archived', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (user_id, discovery_run_id, provider)
    references public.discovery_runs (user_id, id, provider)
    on delete cascade
);

create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  model text not null,
  operation text not null,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  default_location text not null default '',
  service_offers text[] not null default '{}',
  discovery_limit smallint not null default 5 check (discovery_limit between 1 and 25),
  gemini_model text not null default 'gemini-3.5-flash-lite',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index discovery_candidates_user_place_uidx
  on public.discovery_candidates (user_id, provider, provider_place_id)
  where provider_place_id is not null;

create index prospects_user_stage_created_idx
  on public.prospects (user_id, stage, created_at desc);
create index tasks_user_due_idx
  on public.tasks (user_id, due_at)
  where completed_at is null;
create index tasks_user_idx on public.tasks (user_id);
create index tasks_prospect_id_idx on public.tasks (prospect_id);
create index activities_user_created_idx
  on public.activities (user_id, created_at desc);
create index activities_prospect_created_idx
  on public.activities (prospect_id, created_at desc);
create index discovery_runs_user_created_idx
  on public.discovery_runs (user_id, created_at desc);
create index discovery_candidates_run_idx
  on public.discovery_candidates (discovery_run_id);
create index discovery_candidates_user_status_idx
  on public.discovery_candidates (user_id, review_status, created_at desc);
create index ai_usage_user_created_idx
  on public.ai_usage (user_id, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger prospects_set_updated_at
before update on public.prospects
for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

alter table public.prospects enable row level security;
alter table public.tasks enable row level security;
alter table public.activities enable row level security;
alter table public.discovery_runs enable row level security;
alter table public.discovery_candidates enable row level security;
alter table public.ai_usage enable row level security;
alter table public.user_settings enable row level security;

revoke all on table
  public.prospects,
  public.tasks,
  public.activities,
  public.discovery_runs,
  public.discovery_candidates,
  public.ai_usage,
  public.user_settings
from anon, authenticated;

grant select, insert, update, delete on table
  public.prospects,
  public.tasks,
  public.activities,
  public.discovery_runs,
  public.discovery_candidates,
  public.user_settings
to authenticated;

grant select, insert on table public.ai_usage to authenticated;

revoke all on sequence
  public.prospects_id_seq,
  public.tasks_id_seq,
  public.activities_id_seq,
  public.discovery_runs_id_seq,
  public.discovery_candidates_id_seq,
  public.ai_usage_id_seq
from anon, authenticated;

grant usage on sequence
  public.prospects_id_seq,
  public.tasks_id_seq,
  public.activities_id_seq,
  public.discovery_runs_id_seq,
  public.discovery_candidates_id_seq,
  public.ai_usage_id_seq
to authenticated;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- Secure a legacy project helper that was exposed through the Data API before
-- LifeDesk's schema was introduced. It is not used by this application.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

create policy "prospects_select_own" on public.prospects
for select to authenticated using ((select auth.uid()) = user_id);
create policy "prospects_insert_own" on public.prospects
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "prospects_update_own" on public.prospects
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "prospects_delete_own" on public.prospects
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "tasks_select_own" on public.tasks
for select to authenticated using ((select auth.uid()) = user_id);
create policy "tasks_insert_own" on public.tasks
for insert to authenticated with check (
  (select auth.uid()) = user_id
  and (
    prospect_id is null
    or exists (
      select 1 from public.prospects
      where prospects.id = prospect_id
        and prospects.user_id = (select auth.uid())
    )
  )
);
create policy "tasks_update_own" on public.tasks
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    prospect_id is null
    or exists (
      select 1 from public.prospects
      where prospects.id = prospect_id
        and prospects.user_id = (select auth.uid())
    )
  )
);
create policy "tasks_delete_own" on public.tasks
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "activities_select_own" on public.activities
for select to authenticated using ((select auth.uid()) = user_id);
create policy "activities_insert_own" on public.activities
for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.prospects
    where prospects.id = prospect_id
      and prospects.user_id = (select auth.uid())
  )
);
create policy "activities_update_own" on public.activities
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.prospects
    where prospects.id = prospect_id
      and prospects.user_id = (select auth.uid())
  )
);
create policy "activities_delete_own" on public.activities
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "discovery_runs_select_own" on public.discovery_runs
for select to authenticated using ((select auth.uid()) = user_id);
create policy "discovery_runs_insert_own" on public.discovery_runs
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "discovery_runs_update_own" on public.discovery_runs
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "discovery_runs_delete_own" on public.discovery_runs
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "discovery_candidates_select_own" on public.discovery_candidates
for select to authenticated using ((select auth.uid()) = user_id);
create policy "discovery_candidates_insert_own" on public.discovery_candidates
for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.discovery_runs
    where discovery_runs.id = discovery_run_id
      and discovery_runs.user_id = (select auth.uid())
  )
);
create policy "discovery_candidates_update_own" on public.discovery_candidates
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.discovery_runs
    where discovery_runs.id = discovery_run_id
      and discovery_runs.user_id = (select auth.uid())
  )
);
create policy "discovery_candidates_delete_own" on public.discovery_candidates
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "ai_usage_select_own" on public.ai_usage
for select to authenticated using ((select auth.uid()) = user_id);
create policy "ai_usage_insert_own" on public.ai_usage
for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "user_settings_select_own" on public.user_settings
for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_settings_insert_own" on public.user_settings
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_settings_update_own" on public.user_settings
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "user_settings_delete_own" on public.user_settings
for delete to authenticated using ((select auth.uid()) = user_id);
