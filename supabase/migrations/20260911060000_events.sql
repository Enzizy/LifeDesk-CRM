-- Scheduled events: meetings, calls, follow-ups and deadlines. Tasks already
-- carry a due date; events carry a real time, an optional end, and an
-- optional link to the prospect they are about. Together they make up the
-- calendar.

create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  prospect_id bigint,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  kind text not null default 'meeting'
    check (kind in ('meeting', 'call', 'follow_up', 'deadline', 'other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at),
  foreign key (user_id, prospect_id)
    references public.prospects (user_id, id)
    on delete set null (prospect_id)
);

create index events_user_starts_idx on public.events (user_id, starts_at);
create index events_prospect_idx on public.events (prospect_id);

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

alter table public.events enable row level security;

revoke all on table public.events from anon, authenticated;
grant select, insert, update, delete on table public.events to authenticated;

revoke all on sequence public.events_id_seq from anon, authenticated;
grant usage on sequence public.events_id_seq to authenticated;

create policy "events_select_own" on public.events
for select to authenticated using ((select auth.uid()) = user_id);
create policy "events_insert_own" on public.events
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
create policy "events_update_own" on public.events
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
create policy "events_delete_own" on public.events
for delete to authenticated using ((select auth.uid()) = user_id);

-- Scheduling something for a prospect is a timeline event in its own right.
alter table public.activities drop constraint activities_kind_check;
alter table public.activities add constraint activities_kind_check
  check (kind in ('note', 'stage_change', 'email_draft', 'outreach', 'task', 'meeting', 'system'));
