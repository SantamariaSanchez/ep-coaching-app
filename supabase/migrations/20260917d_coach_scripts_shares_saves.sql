-- Retour direct (2026-09-17) : "like et comment et partage et save" — le
-- tracking de performance ajoute deux metriques manquantes en plus de
-- views/likes/comments_count (20260910b_coach_scripts_performance_tracking.sql).
-- Le tracking existe deja dans l'appli (Studio creatif) depuis le
-- 2026-09-10, ce n'est pas un chantier a construire de zero, juste a
-- completer.
alter table public.coach_scripts
  add column if not exists shares integer,
  add column if not exists saves integer;
