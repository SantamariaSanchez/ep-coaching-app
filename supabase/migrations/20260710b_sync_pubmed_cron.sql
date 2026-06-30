-- Planifie la synchronisation quotidienne PubMed -> onglet "Actualité"
-- (voir app/api/cron/sync-pubmed) via Supabase pg_cron, même mécanisme que
-- send-client-reminders / nag-tasks.
-- IMPORTANT : remplace REPLACE_WITH_CRON_SECRET par la vraie valeur de
-- CRON_SECRET (Vercel) avant d'exécuter cette migration.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('sync-pubmed-actualite')
where exists (select 1 from cron.job where jobname = 'sync-pubmed-actualite');

select cron.schedule(
  'sync-pubmed-actualite',
  '0 5 * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/sync-pubmed',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
