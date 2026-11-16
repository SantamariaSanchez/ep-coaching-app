-- Synchro des stats réseaux : quotidienne (6h Paris) au lieu d'hebdomadaire.
-- Le job « social-sync-weekly » avait disparu de cron.job : plus aucune
-- synchro depuis le 02/11 (Instagram) et le 12/10 (autres plateformes), donc
-- plus de données pour l'itération des routines de contenu. Même méthode que
-- 20260929_social_stats.sql : le secret est repris d'un job existant.
do $$
declare
  secret text;
begin
  select substring(command from 'Bearer ([^'']+)') into secret
  from cron.job
  where command like '%Bearer %' and command not like '%REPLACE_WITH_CRON_SECRET%'
  limit 1;

  if secret is null then
    raise notice 'Aucun job cron avec un vrai secret trouvé : social-sync-daily n''est pas planifié.';
    return;
  end if;

  perform cron.unschedule('social-sync-weekly') where exists (select 1 from cron.job where jobname = 'social-sync-weekly');
  perform cron.unschedule('social-sync-daily') where exists (select 1 from cron.job where jobname = 'social-sync-daily');
  perform cron.schedule(
    'social-sync-daily',
    '0 4,5 * * *',
    format(
      $job$select net.http_get(url := 'https://ep-coaching.vercel.app/api/cron/social-sync?auto=1', headers := jsonb_build_object('Authorization', 'Bearer %s'), timeout_milliseconds := 10000);$job$,
      secret
    )
  );
end $$;
