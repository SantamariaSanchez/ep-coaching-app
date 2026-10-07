-- Performances par discipline (2026-10-07) : course, Hyrox, CrossFit, force,
-- rééducation, suivi santé. Un seul tableau générique : la forme de `data`
-- est définie dans lib/disciplines.ts, validée côté serveur avant écriture.
-- Le coach lit les saisies de ses clients (même règle que daily_logs via
-- is_own_coach), seul le propriétaire écrit.

create table if not exists public.performance_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  discipline text not null check (discipline in ('course', 'hyrox', 'crossfit', 'force', 'reeducation', 'sante')),
  kind text not null check (length(kind) between 1 and 40),
  performed_on date not null default current_date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists performance_entries_owner_idx on public.performance_entries(owner_id, discipline, performed_on desc);

alter table public.performance_entries enable row level security;

drop policy if exists performance_entries_read on public.performance_entries;
create policy performance_entries_read on public.performance_entries
  for select using (owner_id = (select auth.uid()) or is_own_coach(owner_id));

drop policy if exists performance_entries_write on public.performance_entries;
create policy performance_entries_write on public.performance_entries
  for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
