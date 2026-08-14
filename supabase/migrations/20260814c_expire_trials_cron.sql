-- Programme le job "expiration des essais coaching" chaque jour 9h via
-- Supabase pg_cron (voir app/api/cron/expire-trials). Déjà exécuté
-- manuellement en production avec le vrai secret au moment du chantier
-- (jobid 29) — ce fichier documente le changement avec le placeholder
-- habituel.
-- IMPORTANT : remplacer REPLACE_WITH_CRON_SECRET par le vrai CRON_SECRET
-- (même valeur que les autres jobs) avant d'exécuter ailleurs.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('expire-trials')
where exists (select 1 from cron.job where jobname = 'expire-trials');

select cron.schedule(
  'expire-trials',
  '0 9 * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/expire-trials',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
