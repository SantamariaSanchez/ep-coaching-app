-- Programme le job "relance si une séance planifiée n'a pas été loggée"
-- une fois par soir via Supabase pg_cron (voir
-- app/api/cron/missed-session-check). 21h Paris ~ 19h/20h UTC selon la
-- saison — un léger décalage possible en été, sans conséquence pour un
-- rappel du soir qui n'a pas besoin de précision à la minute.
-- IMPORTANT : remplace REPLACE_WITH_CRON_SECRET par le vrai CRON_SECRET
-- (même valeur que les autres jobs) avant d'exécuter.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('missed-session-check')
where exists (select 1 from cron.job where jobname = 'missed-session-check');

select cron.schedule(
  'missed-session-check',
  '0 20 * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/missed-session-check',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
