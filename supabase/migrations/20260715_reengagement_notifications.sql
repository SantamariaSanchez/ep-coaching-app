-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Rappel hebdo de réengagement (push ou email)
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════
-- Objectif : les clients qui se sont inscrits mais n'utilisent plus l'app,
-- ou qui n'ont jamais activé les notifications, ne reçoivent aujourd'hui
-- plus aucune sollicitation après leur inscription. Ce job envoie au
-- maximum 1 rappel par semaine et par client — jamais plus, quel que soit
-- l'historique — via push s'ils sont abonnés, sinon par email.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists last_reengagement_notified_at timestamptz;

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('weekly-reengagement')
where exists (select 1 from cron.job where jobname = 'weekly-reengagement');

-- Tous les lundis à 15h UTC (~16h/17h heure française selon la saison).
select cron.schedule(
  'weekly-reengagement',
  '0 15 * * 1',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/weekly-reengagement',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
