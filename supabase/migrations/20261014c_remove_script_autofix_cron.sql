-- La correction automatique des scripts du Studio est retirée (demande du
-- fondateur) : on supprime la tâche planifiée si elle existe.
select cron.unschedule('script-autofix') where exists (select 1 from cron.job where jobname = 'script-autofix');
