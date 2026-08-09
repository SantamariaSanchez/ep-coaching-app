-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Rappels de repas automatiques (heure du repas + deep-link)
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════
-- Objectif : réduire la friction au minimum. À l'heure habituelle de
-- chaque repas (voir DEFAULT_SLOT_TIMES dans le code de la route), le
-- client reçoit une push qui l'emmène directement sur ce repas dans son
-- plan — aliments et quantités déjà prêts, un seul tap pour valider.
-- Tourne toutes les 15 minutes toute la journée (le code de la route gère
-- lui-même la conversion de fuseau Europe/Paris, contrairement aux autres
-- crons horaires de l'appli qui utilisent un simple décalage UTC figé —
-- celui-ci tourne en continu, un décalage figé dériverait à l'heure d'été).
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('meal-reminders')
where exists (select 1 from cron.job where jobname = 'meal-reminders');

select cron.schedule(
  'meal-reminders',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/meal-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
