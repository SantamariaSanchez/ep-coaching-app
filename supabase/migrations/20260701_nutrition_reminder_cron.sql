-- Cron job : rappel bilan nutrition rapide chaque soir à 20h00 (Paris)
-- Appelle /api/cron/nutrition-reminder via pg_net
-- Déclenche une push notification "Bilan rapide" aux clients non trackés

select cron.schedule(
  'nutrition-reminder-20h',
  '0 19 * * *',   -- 19h UTC = 20h Paris (heure d'été) / 20h UTC = 21h (hiver) — ajuste si besoin
  $$
    select net.http_post(
      url := 'https://ep-coaching.vercel.app/api/cron/nutrition-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
      ),
      body := '{}'::jsonb
    )
  $$
);
