-- L'historique des tâches planifiées grossissait sans limite (243 000 lignes,
-- 116 Mo sur 160 Mo de base au 17/11/2026, plusieurs tâches tournent chaque
-- minute). On garde 7 jours, nettoyés chaque nuit.
select cron.unschedule('cron-history-cleanup') where exists (select 1 from cron.job where jobname = 'cron-history-cleanup');
select cron.schedule(
  'cron-history-cleanup',
  '23 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$
);
-- Premier nettoyage immédiat.
delete from cron.job_run_details where end_time < now() - interval '7 days';
