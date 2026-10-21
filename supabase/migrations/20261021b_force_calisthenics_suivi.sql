-- Force, powerlifting, street workout et calisthenics (2026-10-21).
-- Rejouable. Le code tourne avec ou sans cette migration (repli automatique :
-- l'intensité part alors dans la note de l'exercice).
--
-- 1. Intensité prescrite (« RPE 8 », « 75 % ») sur les exercices de programme
--    et de modèle, pour la force.
-- 2. Discipline « calisthenics » dans la page Performances.
-- Le détail des séries de force (poids du corps, lest, assistance, étape de
-- skill, RPE, tentative) réutilise session_sets.details (migration 20261014).

alter table public.exercises
  add column if not exists intensity text;

alter table public.program_template_exercises
  add column if not exists intensity text;

alter table public.performance_entries drop constraint if exists performance_entries_discipline_check;
alter table public.performance_entries add constraint performance_entries_discipline_check
  check (discipline in ('course', 'hyrox', 'crossfit', 'force', 'calisthenics', 'reeducation', 'sante', 'prepa', 'maternite'));
