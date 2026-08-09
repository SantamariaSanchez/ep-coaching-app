-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Nudge upsell coaching pour les membres gratuits actifs
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════
-- Objectif : le rappel hebdo (weekly-reengagement) relance déjà tout le
-- monde sur l'usage général de l'appli, mais aucune notification ne pousse
-- jamais explicitement vers l'abonnement coaching. Ce job cible les
-- membres gratuits qui utilisent réellement l'appli (activité récente via
-- gamification_points — check-in, nutrition, séance, communauté...) sans
-- être abonnés, et leur propose le coaching. Volontairement rare (2x/mois,
-- avec un garde-fou à 28 jours) pour ne jamais ressembler à du harcèlement
-- commercial.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists last_upsell_notified_at timestamptz;

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('coach-upsell-nudge')
where exists (select 1 from cron.job where jobname = 'coach-upsell-nudge');

-- Les 1er et 15 de chaque mois à 16h UTC (~17h/18h heure française selon la saison).
select cron.schedule(
  'coach-upsell-nudge',
  '0 16 1,15 * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/coach-upsell',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
