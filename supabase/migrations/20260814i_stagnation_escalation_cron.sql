-- Programme le job de lutte anti-stagnation (logbook, nutrition, tâches,
-- check-in) une fois par jour via Supabase pg_cron (voir
-- app/api/cron/stagnation-escalation). 19h Paris ~ 17h/18h UTC selon la
-- saison — avant le rappel nutrition du soir (20h), pour ne pas noyer le
-- client sous deux notifications coup sur coup.
-- IMPORTANT : remplace REPLACE_WITH_CRON_SECRET par le vrai CRON_SECRET
-- (même valeur que les autres jobs) avant d'exécuter.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('stagnation-escalation')
where exists (select 1 from cron.job where jobname = 'stagnation-escalation');

select cron.schedule(
  'stagnation-escalation',
  '0 17 * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/stagnation-escalation',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
