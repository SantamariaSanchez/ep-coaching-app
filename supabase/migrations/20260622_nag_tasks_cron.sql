-- Schedules the "nag client about pending tasks" job every 10 minutes via
-- Supabase pg_cron, instead of Vercel Cron (Hobby plan only allows daily
-- cron jobs, which defeats the purpose of a 15/30/60-min nag interval).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('nag-client-tasks')
where exists (select 1 from cron.job where jobname = 'nag-client-tasks');

select cron.schedule(
  'nag-client-tasks',
  '*/10 * * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/nag-tasks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
