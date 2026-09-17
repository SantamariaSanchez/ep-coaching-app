-- Applique enfin 20260916_fix_dst_drift_notification_crons.sql, resté en
-- attente depuis la veille (l'utilisateur n'avait pas accès à l'appli pour
-- l'exécuter dans le SQL Editor, voir MASTERCLASS.md Axe DV). Le code des
-- 5 routes concernées (nutrition-reminder, missed-session-check,
-- stagnation-escalation, weekly-progress-recap, weekly-sleep-recap)
-- implémentait déjà le bon calcul dynamique en heure de Paris (nowInParis),
-- vérifié avant d'appliquer.
--
-- Utilise cron.alter_job (jamais cron.unschedule/cron.schedule du fichier
-- d'origine) pour ne changer QUE le schedule : le command de ces jobs
-- contient le vrai CRON_SECRET en clair, pas le placeholder
-- REPLACE_WITH_CRON_SECRET du fichier d'origine — le recréer via
-- cron.schedule aurait cassé les 5 jobs en silence.

select cron.alter_job(job_id := 25, schedule := '*/15 * * * *')
where exists (select 1 from cron.job where jobid = 25 and jobname = 'nutrition-reminder-20h');

select cron.alter_job(job_id := 27, schedule := '*/15 * * * *')
where exists (select 1 from cron.job where jobid = 27 and jobname = 'missed-session-check');

select cron.alter_job(job_id := 30, schedule := '*/15 * * * *')
where exists (select 1 from cron.job where jobid = 30 and jobname = 'stagnation-escalation');

select cron.alter_job(job_id := 28, schedule := '0 * * * 0')
where exists (select 1 from cron.job where jobid = 28 and jobname = 'weekly-progress-recap');

select cron.alter_job(job_id := 22, schedule := '0 * * * 0')
where exists (select 1 from cron.job where jobid = 22 and jobname = 'weekly-sleep-recap');
