-- Programme la relance « raconte ta semaine » (contenu vécu / storytelling) :
-- vendredi et dimanche à 16h UTC (17h ou 18h à Paris), voir
-- app/api/cron/lived-weekly. La route ne notifie que si aucune note #vécu n'a
-- été écrite depuis lundi.
-- IMPORTANT : remplace REPLACE_WITH_CRON_SECRET par le vrai CRON_SECRET (même
-- valeur que les autres jobs) avant d'exécuter, à la main dans le Supabase
-- SQL Editor. Aucune table n'est créée ou modifiée.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('lived-weekly')
where exists (select 1 from cron.job where jobname = 'lived-weekly');

select cron.schedule(
  'lived-weekly',
  '0 16 * * 5,0',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/lived-weekly',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
