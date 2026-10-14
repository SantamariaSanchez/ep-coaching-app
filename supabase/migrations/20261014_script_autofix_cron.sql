-- Correction automatique des scripts du Studio hors vocabulaire
-- (app/api/cron/script-autofix) : toutes les 10 minutes, 3 scripts au plus
-- par passage. Le secret CRON_SECRET réel est repris d'un job existant.
-- Ré-exécutable sans erreur.
do $$
declare
  secret text;
begin
  select substring(command from 'Bearer ([^'']+)') into secret
  from cron.job
  where command like '%Bearer %' and command not like '%REPLACE_WITH_CRON_SECRET%'
  limit 1;

  if secret is null then
    raise notice 'Aucun job cron avec un vrai secret trouvé : script-autofix pas planifié.';
    return;
  end if;

  perform cron.unschedule('script-autofix') where exists (select 1 from cron.job where jobname = 'script-autofix');
  perform cron.schedule(
    'script-autofix',
    '*/10 * * * *',
    format(
      $job$select net.http_get(url := 'https://ep-coaching.vercel.app/api/cron/script-autofix', headers := jsonb_build_object('Authorization', 'Bearer %s'), timeout_milliseconds := 300000);$job$,
      secret
    )
  );
end $$;
