-- Programme le job "suppression des comptes gratuits inactifs" chaque jour
-- 8h05 UTC via Supabase pg_cron (voir app/api/cron/free-tier-inactivity et
-- lib/free-tier.ts). Décalé de expire-trials (9h00) pour ne pas cogner la
-- même minute.
-- IMPORTANT : remplacer REPLACE_WITH_CRON_SECRET par le vrai CRON_SECRET
-- (même valeur que les autres jobs) avant d'exécuter.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('free-tier-inactivity')
where exists (select 1 from cron.job where jobname = 'free-tier-inactivity');

select cron.schedule(
  'free-tier-inactivity',
  '5 8 * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/free-tier-inactivity',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
