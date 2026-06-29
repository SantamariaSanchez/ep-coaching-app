-- Schedules the "send due client reminders" job every 10 minutes via
-- Supabase pg_cron. The "Mes rappels" feature had no cron actually reading
-- the reminders table — this fixes that (see app/api/cron/send-reminders).
-- IMPORTANT: replace REPLACE_WITH_CRON_SECRET with the real CRON_SECRET
-- value (same one used by the nag-client-tasks job) before running.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('send-client-reminders')
where exists (select 1 from cron.job where jobname = 'send-client-reminders');

select cron.schedule(
  'send-client-reminders',
  '*/10 * * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/send-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
