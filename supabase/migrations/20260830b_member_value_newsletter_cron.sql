-- Newsletter quotidienne "valeur app" pour tous les membres (demande
-- explicite 2026-08-30). Meme convention que les autres cron http_get de
-- ce fichier (schedule-block-notify, meal-reminders...) : pg_cron toutes
-- les 24h, appelle la route Vercel avec le secret CRON_SECRET en Bearer.
--
-- Horaire choisi : 13h UTC = 15h Europe/Paris en heure d'ete (CEST), pour
-- ne pas tomber au meme moment que la newsletter generale existante
-- (job "newsletter-daily", 6h UTC = 8h Paris, liste "Newsletter EP
-- Coaching" separee, audience grand public). Celle-ci cible exclusivement
-- les membres deja inscrits sur l'appli (liste Brevo "Tous les membres
-- EP Coaching", creee/synchronisee automatiquement par la route elle-meme).
-- REPLACE_WITH_CRON_SECRET : le vrai secret CRON_SECRET (voir Vercel) est
-- substitue uniquement en base au moment de l'application, jamais commite
-- ici en clair (meme convention que les autres migrations cron de ce
-- dossier, ex. 20260810b_schedule_block_notify_cron.sql).
select cron.schedule(
  'member-value-newsletter',
  '0 13 * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/member-value-newsletter',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
