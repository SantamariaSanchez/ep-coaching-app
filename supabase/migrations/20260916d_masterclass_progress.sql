-- ═══════════════════════════════════════════════════════════
-- EP Coaching — Progression des guides Masterclass (coach)
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Nouvel onglet "Masterclass" côté coach (demande directe du fondateur,
-- 2026-09-16) : des tutoriels texte complets, avec de vraies étapes à
-- suivre pour produire un résultat réel (pas juste lire). Le CONTENU des
-- guides vit en dur dans lib/masterclass-guides.ts (statique, partagé par
-- tous les coachs, édité uniquement dans le code, même logique que
-- lib/content-library.ts) : cette table ne stocke QUE la progression
-- personnelle de chaque coach (case cochée par étape), jamais le contenu.

create table if not exists public.coach_masterclass_progress (
  coach_id uuid not null references public.profiles(id) on delete cascade,

  -- Slug du guide dans lib/masterclass-guides.ts (ex: "notion-systeme-coach").
  -- Texte libre, pas de check ni de FK vers une table : le contenu n'est
  -- pas en base, voir le commentaire ci-dessus.
  guide_slug text not null,

  -- Index de l'étape dans guide.steps (0-based), pas un identifiant propre
  -- à l'étape : suffisant puisque l'ordre des étapes d'un guide ne change
  -- pas rétroactivement une fois publié (comme les steps de coach_scripts).
  step_index integer not null check (step_index >= 0),

  completed_at timestamptz not null default now(),

  primary key (coach_id, guide_slug, step_index)
);

comment on table public.coach_masterclass_progress is
  'Progression personnelle de chaque coach sur les guides Masterclass (lib/masterclass-guides.ts). Contenu des guides en dur dans le code, seule la case cochée par étape vit ici.';
comment on column public.coach_masterclass_progress.guide_slug is
  'Slug du guide dans lib/masterclass-guides.ts (MASTERCLASS_GUIDES) — texte libre, pas de FK, le contenu n''est pas en base.';
comment on column public.coach_masterclass_progress.step_index is
  'Index 0-based de l''étape dans guide.steps.';

create index if not exists coach_masterclass_progress_coach_idx
  on public.coach_masterclass_progress (coach_id, guide_slug);

alter table public.coach_masterclass_progress enable row level security;

-- (select auth.uid()) plutôt qu'un appel nu à auth.uid() — évite d'avoir à
-- corriger après coup pour la perf du plan Postgres (voir
-- 20260814o_rls_initplan_perf_fix.sql, déjà appliqué à d'autres tables).
drop policy if exists "Coach manages own masterclass progress" on public.coach_masterclass_progress;
create policy "Coach manages own masterclass progress" on public.coach_masterclass_progress
  for all using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
