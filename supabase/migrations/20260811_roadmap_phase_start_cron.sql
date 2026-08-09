-- Programme le job "notifie le début d'une nouvelle phase de road map" une
-- fois par jour via Supabase pg_cron (voir app/api/cron/roadmap-phase-start).
-- IMPORTANT : remplace REPLACE_WITH_CRON_SECRET par le vrai CRON_SECRET
-- (même valeur que les autres jobs) avant d'exécuter.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('roadmap-phase-start')
where exists (select 1 from cron.job where jobname = 'roadmap-phase-start');

select cron.schedule(
  'roadmap-phase-start',
  '0 6 * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/roadmap-phase-start',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
