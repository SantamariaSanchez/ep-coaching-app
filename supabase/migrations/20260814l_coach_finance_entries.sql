-- Axe 4 (VISION.md) : comptabilité personnelle du coach pour SON activité
-- (distinct de lib/coach-billing.ts, qui suit l'abonnement du coach À LA
-- PLATEFORME, et distinct de /dashboard/coach/finance, le MRR plateforme
-- réservé au fondateur). Ici : un simple journal revenus/dépenses que
-- chaque coach tient pour lui-même, scopé par coach_id dès le départ.
create table if not exists public.coach_finance_entries (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  entry_date date not null default current_date,
  kind text not null check (kind in ('revenu', 'depense')),
  category text not null,
  label text not null,
  amount numeric(10, 2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists coach_finance_entries_coach_id_idx on public.coach_finance_entries(coach_id, entry_date desc);

alter table public.coach_finance_entries enable row level security;

drop policy if exists "Coach manages own finance entries" on public.coach_finance_entries;
create policy "Coach manages own finance entries" on public.coach_finance_entries
  for all using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
