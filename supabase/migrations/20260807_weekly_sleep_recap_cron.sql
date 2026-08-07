-- Planifie le récap hebdo sommeil/récupération, tous les dimanches à 20h
-- (heure Paris en hiver, 21h en été — pg_cron tourne en UTC, précision
-- non critique pour un récap hebdo) — voir app/api/cron/weekly-sleep-recap.
-- IMPORTANT : remplace REPLACE_WITH_CRON_SECRET par la vraie valeur de
-- CRON_SECRET (Vercel) avant d'exécuter cette migration.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('weekly-sleep-recap')
where exists (select 1 from cron.job where jobname = 'weekly-sleep-recap');

select cron.schedule(
  'weekly-sleep-recap',
  '0 19 * * 0',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/weekly-sleep-recap',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
