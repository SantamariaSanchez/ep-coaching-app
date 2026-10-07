-- Positionnement du coach (2026-10-07) : niche, résultat promis, avatar
-- client, offre, différence. Rempli dans l'appli (Business > Ma niche et
-- mon avatar) et lisible par Claude via le connecteur EP Coaching pour
-- écrire des scripts, une bio ou la page Notion du coach avec ses infos.

create table if not exists public.coach_positioning (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.coach_positioning enable row level security;

drop policy if exists coach_positioning_owner on public.coach_positioning;
create policy coach_positioning_owner on public.coach_positioning
  for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
