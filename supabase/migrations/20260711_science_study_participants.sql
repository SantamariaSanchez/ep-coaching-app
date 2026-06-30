-- EP Coaching — Participation aux études internes ("Nos études").
-- Débloqué par points (rang Vétéran, voir lib/gamification-types.ts) ou par
-- l'abonnement — la table elle-même n'a pas besoin de connaître cette
-- règle, c'est vérifié côté appli avant d'autoriser l'insert.

create table if not exists public.science_study_participants (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.science_studies(id) on delete cascade,
  participant_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (study_id, participant_id)
);

create index if not exists idx_study_participants_study on public.science_study_participants (study_id);
create index if not exists idx_study_participants_participant on public.science_study_participants (participant_id);

alter table if exists public.science_study_participants disable row level security;
