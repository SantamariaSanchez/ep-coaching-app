-- Programme le job "récap hebdo de progression" (séances, nutrition, poids)
-- chaque dimanche 18h via Supabase pg_cron (voir
-- app/api/cron/weekly-progress-recap). Déjà exécuté manuellement en
-- production avec le vrai secret au moment du chantier (jobid 28) — ce
-- fichier documente le changement avec le placeholder habituel.
-- IMPORTANT : remplacer REPLACE_WITH_CRON_SECRET par le vrai CRON_SECRET
-- (même valeur que les autres jobs) avant d'exécuter ailleurs.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('weekly-progress-recap')
where exists (select 1 from cron.job where jobname = 'weekly-progress-recap');

select cron.schedule(
  'weekly-progress-recap',
  '0 18 * * 0',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/weekly-progress-recap',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
