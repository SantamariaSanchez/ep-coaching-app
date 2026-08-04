-- Cron job : détecte les messages clients sans réponse coach depuis plus de
-- 24h, notifie le fondateur (peccoux.manu@gmail.com) par email via notifyAdmin.
-- Appelle /api/cron/stale-messages une fois par jour à 9h00 (Paris).
-- Suppose que app.cron_secret est déjà configuré (même secret que les autres
-- crons pg_net de ce projet — voir 20260701_nutrition_reminder_cron.sql).

select cron.schedule(
  'stale-messages-9h',
  '0 8 * * *',   -- 8h UTC = 9h Paris (hiver) / 10h (été) — ajuste si besoin
  $$
    select net.http_post(
      url := 'https://ep-coaching.vercel.app/api/cron/stale-messages',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
      ),
      body := '{}'::jsonb
    )
  $$
);
