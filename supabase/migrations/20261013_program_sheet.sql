-- Conception de programme façon tableur (2026-10-13, retour de la première
-- coach inscrite : « pas de superset, pas de gainage en temps »).
--
-- exercises / program_template_exercises :
--   superset_group : lettre partagée par les exercices enchaînés sans repos
--                    (A1/A2 = même groupe "A"). NULL = exercice seul.
--   reps_unit      : NULL ou 'reps' = répétitions, 'sec' = secondes (gainage,
--                    planche, chaise), 'm' = mètres (sled, farmer walk).
--   technique      : drop_set, myo_reps, rest_pause, partials, amrap, cluster,
--                    tempo, isometric. NULL = séries classiques.
--   tempo          : texte libre façon "3-1-1-0".
-- program_days.notes : consigne de séance (échauffement, cardio de fin...).
-- programs.delivered_at : moment où le coach a livré le programme au client.
--
-- Le code tourne avec ou sans cette migration (repli automatique, les infos
-- partent alors dans la note de l'exercice pour ne rien perdre).

alter table public.exercises
  add column if not exists superset_group text,
  add column if not exists reps_unit text,
  add column if not exists technique text,
  add column if not exists tempo text;

alter table public.program_template_exercises
  add column if not exists superset_group text,
  add column if not exists reps_unit text,
  add column if not exists technique text,
  add column if not exists tempo text;

alter table public.program_days
  add column if not exists notes text;

alter table public.program_template_days
  add column if not exists notes text;

alter table public.programs
  add column if not exists delivered_at timestamptz;
