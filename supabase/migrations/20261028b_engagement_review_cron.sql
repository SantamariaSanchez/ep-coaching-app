-- Programme le job « appel bilan un mois avant la fin d'engagement » une fois
-- par jour via Supabase pg_cron (voir app/api/cron/engagement-review).
-- IMPORTANT : remplace REPLACE_WITH_CRON_SECRET par le vrai CRON_SECRET
-- (même valeur que les autres jobs) avant d'exécuter. À lancer manuellement
-- dans le Supabase SQL Editor, après 20261028_phases_modifiables_et_engagement.sql.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('engagement-review')
where exists (select 1 from cron.job where jobname = 'engagement-review');

select cron.schedule(
  'engagement-review',
  '15 6 * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/engagement-review',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
