-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching : phases de coaching réversibles + engagement de 6 mois
-- À exécuter dans le Supabase SQL Editor (jamais automatisé par Vercel)
-- ═══════════════════════════════════════════════════════════════════════
-- 1. client_coaching_phases : durée prévue en semaines (modifiable) et lien
--    vers la ligne remplacée, pour pouvoir annuler un changement de phase
--    (on supprime la ligne créée et on rouvre la précédente).
-- 2. client_engagements : durée d'engagement d'un client coaché (6 mois par
--    défaut, modifiable par le coach), date de début et de fin. Le client la
--    lit (pour « mois X sur 6 »), seul son coach l'écrit. L'appel bilan est
--    déclenché 1 mois avant la fin.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.client_coaching_phases
  add column if not exists planned_weeks integer
    check (planned_weeks is null or (planned_weeks between 1 and 52));

alter table public.client_coaching_phases
  add column if not exists replaces_id uuid
    references public.client_coaching_phases(id) on delete set null;

create table if not exists public.client_engagements (
  client_id uuid primary key references public.profiles(id) on delete cascade,
  duration_months integer not null default 6 check (duration_months between 1 and 24),
  start_date date not null,
  end_date date not null,
  -- Bilan de fin de mois 5 : notification coach envoyée (anti doublon).
  review_notified_at timestamptz,
  -- Suite décidée avec le client une fois le bilan fait.
  renewal_status text check (renewal_status in ('en_reflexion', 'renouvele', 'arrete')),
  note text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists client_engagements_end_idx on public.client_engagements (end_date);

alter table public.client_engagements enable row level security;

drop policy if exists "Coach manages own client engagements" on public.client_engagements;
create policy "Coach manages own client engagements" on public.client_engagements
  for all using (public.is_own_coach(client_id))
  with check (public.is_own_coach(client_id));

-- Le client lit sa propre fiche d'engagement (progression « mois X sur 6 »),
-- sans pouvoir la modifier.
drop policy if exists "Client reads own engagement" on public.client_engagements;
create policy "Client reads own engagement" on public.client_engagements
  for select using (client_id = auth.uid());

-- Rattrapage : les clients déjà coachés démarrent leur engagement à leur
-- première activation (sinon aujourd'hui). Fin = début + 6 mois - 1 jour.
insert into public.client_engagements (client_id, duration_months, start_date, end_date)
select
  p.id,
  6,
  coalesce(
    (select min(e.created_at)::date from public.subscription_events e where e.client_id = p.id and e.status = 'active'),
    current_date
  ),
  (coalesce(
    (select min(e.created_at)::date from public.subscription_events e where e.client_id = p.id and e.status = 'active'),
    current_date
  ) + interval '6 months' - interval '1 day')::date
from public.profiles p
where p.role = 'client' and p.subscription_status = 'active'
on conflict (client_id) do nothing;
