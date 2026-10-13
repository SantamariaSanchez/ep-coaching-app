-- ═══════════════════════════════════════════════════════════════════════
-- À COLLER UNE FOIS dans Supabase > SQL Editor > Run (2026-10-13).
-- Regroupe les 3 migrations du jour, toutes rejouables sans risque :
--   1. tableur de programme (supersets, secondes, techniques, tempo, notes)
--   2. rappels d'agenda et rappels perso à la minute près (au lieu de 5 min)
--   3. copie de secours des scripts réécrits dans le Studio
-- ═══════════════════════════════════════════════════════════════════════

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

select cron.alter_job(jobid, schedule := '* * * * *')
from cron.job
where jobname in ('schedule-block-notify', 'send-client-reminders');

alter table public.coach_scripts add column if not exists previous_version jsonb;
