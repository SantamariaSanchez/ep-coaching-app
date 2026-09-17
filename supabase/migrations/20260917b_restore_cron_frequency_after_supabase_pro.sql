-- Annule la migration 20260917_reduce_low_priority_cron_frequency : Santamaria
-- vient de passer le projet Supabase en plan Pro, ce qui lève la crise de
-- quota egress qui justifiait de ralentir ces 4 jobs (voir MASTERCLASS.md
-- Axe DU). Remis à leur pas d'origine, meilleure UX de notification.
-- Toujours via cron.alter_job (pas unschedule/schedule) pour ne jamais
-- toucher au CRON_SECRET réel déjà en place dans le champ command.

select cron.alter_job(job_id := 6, schedule := '*/5 * * * *')
where exists (select 1 from cron.job where jobid = 6 and jobname = 'live-reminders');

select cron.alter_job(job_id := 20, schedule := '*/15 * * * *')
where exists (select 1 from cron.job where jobid = 20 and jobname = 'meal-reminders');

select cron.alter_job(job_id := 1, schedule := '*/10 * * * *')
where exists (select 1 from cron.job where jobid = 1 and jobname = 'nag-client-tasks');

select cron.alter_job(job_id := 2, schedule := '*/10 * * * *')
where exists (select 1 from cron.job where jobid = 2 and jobname = 'send-client-reminders');
