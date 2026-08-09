-- Programme le job "notifie au début d'un bloc d'agenda" toutes les 5
-- minutes via Supabase pg_cron (Vercel Hobby n'autorise que le cron
-- quotidien, voir app/api/cron/schedule-block-notify et le même principe
-- déjà en place pour send-reminders/meal-reminders).
-- IMPORTANT : remplace REPLACE_WITH_CRON_SECRET par le vrai CRON_SECRET
-- (même valeur que les autres jobs) avant d'exécuter.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('schedule-block-notify')
where exists (select 1 from cron.job where jobname = 'schedule-block-notify');

select cron.schedule(
  'schedule-block-notify',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/schedule-block-notify',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
