-- Retour direct 2026-09-16 : "les scripts que je supprime, tu peux encore
-- optimiser en demandant avant de juste cliquer sur la poubelle, un truc du
-- genre pourquoi supprimer, car faux ou car sujet nul etc." Objectif double :
-- (1) éviter une suppression accidentelle en un clic sur une action
-- irréversible, (2) capitaliser sur le POURQUOI pour faire grossir la
-- stratégie de contenu (savoir quels piliers/angles produisent le plus de
-- scripts rejetés pour "sujet nul" est un vrai signal, pas juste une trace).
-- Table séparée plutôt qu'une colonne sur coach_scripts : la ligne du script
-- est supprimée, il faut un endroit pour garder la raison après coup.
create table if not exists public.coach_script_deletion_reasons (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  script_title text not null,
  pillar text,
  platform text,
  format text,
  reason text not null check (reason in ('info_fausse', 'sujet_nul', 'autre')),
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists coach_script_deletion_reasons_coach_id_idx
  on public.coach_script_deletion_reasons (coach_id, created_at desc);

alter table public.coach_script_deletion_reasons enable row level security;

create policy "Coach manages own script deletion reasons" on public.coach_script_deletion_reasons
  for all
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

comment on table public.coach_script_deletion_reasons is
  'Journal des raisons de suppression de scripts (Studio créatif) : jamais affiché comme tel au coach, sert à repérer les piliers/angles qui produisent le plus de scripts rejetés.';
