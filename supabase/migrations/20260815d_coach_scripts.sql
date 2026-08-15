-- Idéation : espace Scripts (demande explicite, 2026-08-15) — écriture de
-- scripts court/long format, concepts, descriptions, à côté des idées
-- (pipeline) et des notes libres déjà en place.

create table if not exists public.coach_scripts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  format text not null default 'court',
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.coach_scripts is
  'Scripts/concepts de contenu écrits par le coach (Idéation) — format court ou long, distinct des idées (content_ideas) et des notes libres (coach_ideation_notes).';
comment on column public.coach_scripts.format is
  'court (Reel/Short/TikTok) ou long (YouTube) — filtre côté UI, pas de contrainte check pour rester tolérant si de nouveaux formats apparaissent.';

create index if not exists coach_scripts_coach_id_idx on public.coach_scripts (coach_id, updated_at desc);

alter table public.coach_scripts enable row level security;

create policy "Coach manages own scripts" on public.coach_scripts
  for all
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));
