-- Planifie le rappel "ton live commence bientôt" toutes les 5 minutes
-- (voir app/api/cron/live-reminders) — même mécanisme que
-- send-client-reminders / nag-tasks.
-- IMPORTANT : remplace REPLACE_WITH_CRON_SECRET par la vraie valeur de
-- CRON_SECRET (Vercel) avant d'exécuter cette migration.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('live-reminders')
where exists (select 1 from cron.job where jobname = 'live-reminders');

select cron.schedule(
  'live-reminders',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/live-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
