-- Discovery now records social profiles alongside phone and website, and
-- approving a candidate can produce a qualification (what the business lacks,
-- which service fits) plus a tailored outreach draft. Drafts are stored, never
-- sent: the freelancer copies them into their own channel.

alter table public.discovery_candidates
  add column socials jsonb not null default '{}'::jsonb
    check (jsonb_typeof(socials) = 'object');

alter table public.prospects
  add column phone text,
  add column website text,
  add column socials jsonb not null default '{}'::jsonb
    check (jsonb_typeof(socials) = 'object'),
  add column gaps text[] not null default '{}',
  add column qualified_at timestamptz;

create table public.message_drafts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  prospect_id bigint not null,
  kind text not null default 'outreach'
    check (kind in ('outreach', 'follow_up', 'proposal')),
  channel text not null default 'email'
    check (channel in ('email', 'message', 'call_script')),
  subject text not null default '',
  body text not null check (char_length(body) between 1 and 8000),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'sent', 'discarded')),
  model text,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  foreign key (user_id, prospect_id)
    references public.prospects (user_id, id)
    on delete cascade
);

create index message_drafts_prospect_created_idx
  on public.message_drafts (prospect_id, created_at desc);
create index message_drafts_user_idx on public.message_drafts (user_id);

alter table public.message_drafts enable row level security;

revoke all on table public.message_drafts from anon, authenticated;
grant select, insert, update, delete on table public.message_drafts to authenticated;

revoke all on sequence public.message_drafts_id_seq from anon, authenticated;
grant usage on sequence public.message_drafts_id_seq to authenticated;

create policy "message_drafts_select_own" on public.message_drafts
for select to authenticated using ((select auth.uid()) = user_id);
create policy "message_drafts_insert_own" on public.message_drafts
for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.prospects
    where prospects.id = prospect_id
      and prospects.user_id = (select auth.uid())
  )
);
create policy "message_drafts_update_own" on public.message_drafts
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "message_drafts_delete_own" on public.message_drafts
for delete to authenticated using ((select auth.uid()) = user_id);

-- Display currency for estimated values. ISO 4217 code; the UI formats it.
alter table public.user_settings
  add column currency_code text not null default 'PHP'
    check (currency_code ~ '^[A-Z]{3}$');
