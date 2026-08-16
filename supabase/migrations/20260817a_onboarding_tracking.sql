-- Fait de la page Organisation un vrai outil opérationnel, pas seulement du
-- contenu de référence (retour direct 2026-08-17 : "je veux une
-- entreprise pas juste ce qu'il y a"). Deux ajouts :
-- 1. Notes libres par candidature (impressions d'entretien, points à
--    vérifier) — un recrutement réel implique des notes, pas seulement un
--    statut binaire.
-- 2. Suivi d'onboarding réel : les 4 étapes déjà documentées dans
--    l'organigramme (TIMELINE, app/dashboard/coach/admin/organisation/
--    page.tsx) deviennent cochables par candidat accepté, au lieu de
--    rester un texte de référence jamais relié à une vraie personne.

alter table public.job_applications add column if not exists notes text;

create table if not exists public.onboarding_steps (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  step_key text not null,
  done boolean not null default false,
  done_at timestamptz,
  unique (application_id, step_key)
);

create index if not exists onboarding_steps_application_idx on public.onboarding_steps(application_id);

alter table public.onboarding_steps enable row level security;

-- Pas de owner_id direct sur cette table (elle n'a de sens que rattachée à
-- une candidature) : la policy passe par job_applications, seule source de
-- vérité pour "qui est le propriétaire".
create policy "onboarding_steps_via_application_owner" on public.onboarding_steps
  for all
  using (
    exists (
      select 1 from public.job_applications ja
      where ja.id = onboarding_steps.application_id
        and ja.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.job_applications ja
      where ja.id = onboarding_steps.application_id
        and ja.owner_id = (select auth.uid())
    )
  );
