-- Programme le job "avertissement de fin de compte gratuit" chaque jour
-- 8h10 UTC via Supabase pg_cron (voir app/api/cron/free-tier-expiring et
-- lib/free-tier.ts). Décalé de free-tier-inactivity (8h05) et expire-trials
-- (9h00) pour ne pas cogner la même minute.
-- IMPORTANT : remplacer REPLACE_WITH_CRON_SECRET par le vrai CRON_SECRET
-- (même valeur que les autres jobs) avant d'exécuter.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('free-tier-expiring')
where exists (select 1 from cron.job where jobname = 'free-tier-expiring');

select cron.schedule(
  'free-tier-expiring',
  '10 8 * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/free-tier-expiring',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
