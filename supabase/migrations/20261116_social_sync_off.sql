-- Plus de Windsor (décision d'Emmanuel, 16/11) : aucune synchro automatique
-- des stats réseaux. Les routines apprennent des transcripts déposés dans
-- Notion. Les stats d'Emmanuel se saisissent à la main, seulement si besoin.
select cron.unschedule(jobname) from cron.job where jobname in ('social-sync-daily', 'social-sync-weekly');
