-- Ferme le trou identifié le 2026-09-17 dans la chaîne de rétention des
-- membres gratuits : lib/first-action-celebration.ts félicite déjà un
-- membre pour sa toute première séance/repas/bilan (in-app + push
-- uniquement, jamais d'email), mais dès que cette action existe le membre
-- est marqué "actif" par app/api/cron/weekly-reengagement (fenêtre de 10
-- jours, voir DORMANT_DAYS) et ne reçoit donc plus RIEN pendant jusqu'à 10
-- jours. Résultat : le moment où un renforcement positif compte le plus
-- (le lendemain de la toute première action, pour transformer un geste
-- isolé en habitude) n'a aujourd'hui aucun canal fiable pour les membres
-- qui n'ont pas (ou plus) le push actif.
--
-- Deux colonnes minimales, jamais dérivées d'ailleurs :
--   first_real_action_at : horodatage de la toute première séance/repas/
--     bilan de ce membre, posé une seule fois par
--     lib/first-action-celebration.ts (celebrateFirstAction), quel que
--     soit lequel des 3 types déclenche en premier.
--   first_action_followup_sent_at : empêche un second envoi si le cron
--     tourne plusieurs fois avant que la fenêtre ne se referme.

alter table public.profiles
  add column if not exists first_real_action_at timestamptz;

alter table public.profiles
  add column if not exists first_action_followup_sent_at timestamptz;

comment on column public.profiles.first_real_action_at is
  'Horodatage de la toute première séance/repas/bilan réel du membre (posé une seule fois par lib/first-action-celebration.ts). Sert de point de départ à la relance J+1 (voir app/api/cron/first-action-followup).';

comment on column public.profiles.first_action_followup_sent_at is
  'Horodatage d''envoi de la relance J+1 après la toute première action (app/api/cron/first-action-followup) — garde-fou anti-doublon, jamais réinitialisé.';

select cron.unschedule('first-action-followup')
where exists (select 1 from cron.job where jobname = 'first-action-followup');

select cron.schedule(
  'first-action-followup',
  '0 16 * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/first-action-followup',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
