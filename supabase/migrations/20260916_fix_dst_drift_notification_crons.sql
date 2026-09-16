-- Corrige le décalage horaire (bug DST) sur les notifications qui doivent
-- sonner à une heure précise attendue par un client/coach. Retour direct du
-- fondateur (2026-09-16) : "les notifs de l'appli, il faut qu'elles arrivent
-- reellement a la bonne heure, pas 2 ou 5 min apres, ou meme bien apres".
--
-- Cause racine : chacun des jobs ci-dessous était programmé via pg_cron avec
-- une expression cron ciblant un décalage UTC FIXE censé correspondre à une
-- heure de Paris précise (ex. '0 19 * * *' commenté "19h UTC = 20h Paris").
-- Deux problèmes cumulés :
--   1. pg_cron ne connaît aucun fuseau horaire et ne s'ajuste JAMAIS seul au
--      changement d'heure été/hiver (2 fois par an, France) — un décalage
--      UTC fixe qui donne la bonne heure Paris à une saison donne
--      automatiquement une heure fausse (+/-1h) à l'autre saison.
--   2. Plusieurs de ces décalages étaient déjà faux au moment où ils ont été
--      écrits (ex. nutrition-reminder : "19h UTC = 20h Paris (été)" est
--      arithmétiquement faux, 19h UTC + 2h (CEST) = 21h Paris).
-- Résultat concret : ces notifications dérivaient silencieusement d'une
-- heure, sans qu'aucune erreur ne remonte nulle part (pg_net ne fait
-- remonter aucune alerte côté appli).
--
-- Correctif structurel (pas juste un recalcul ponctuel qui redeviendrait
-- faux au prochain changement d'heure, le 25 octobre 2026) : chaque job est
-- reprogrammé pour tourner beaucoup plus souvent (toutes les 15 min pour les
-- jobs quotidiens, toutes les heures le dimanche pour les jobs hebdo), et la
-- vraie logique "est-ce l'heure ?" est déplacée DANS la route Next.js
-- correspondante, calculée dynamiquement en heure de Paris à chaque exécution
-- via lib/dates.ts (nowInParis, déjà basé sur Intl/timeZone Europe/Paris —
-- même mécanisme déjà utilisé par app/api/cron/meal-reminders et
-- app/api/cron/send-reminders, qui n'étaient donc pas concernés par ce bug).
--
-- IMPORTANT : remplace REPLACE_WITH_CRON_SECRET par le vrai CRON_SECRET
-- (même valeur que les autres jobs, voir Vercel) avant d'exécuter cette
-- migration dans le Supabase SQL Editor.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── nutrition-reminder-20h ────────────────────────────────────────────────
-- Avant : '0 19 * * *' (une fois/jour, décalage UTC figé). Après : toutes
-- les 15 min, toute la journée — app/api/cron/nutrition-reminder décide
-- maintenant elle-même si on est dans la fenêtre 20h00-20h15 Paris.
select cron.unschedule('nutrition-reminder-20h')
where exists (select 1 from cron.job where jobname = 'nutrition-reminder-20h');

select cron.schedule(
  'nutrition-reminder-20h',
  '*/15 * * * *',
  $$
    select net.http_post(
      url := 'https://ep-coaching.vercel.app/api/cron/nutrition-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
      ),
      body := '{}'::jsonb
    )
  $$
);

-- ── missed-session-check ──────────────────────────────────────────────────
-- Avant : '0 20 * * *' (une fois/jour, décalage UTC figé). Après : toutes
-- les 15 min, toute la journée — app/api/cron/missed-session-check décide
-- maintenant elle-même si on est dans la fenêtre 21h00-21h15 Paris.
select cron.unschedule('missed-session-check')
where exists (select 1 from cron.job where jobname = 'missed-session-check');

select cron.schedule(
  'missed-session-check',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/missed-session-check',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);

-- ── stagnation-escalation ─────────────────────────────────────────────────
-- Avant : '0 17 * * *' (une fois/jour, décalage UTC figé). Après : toutes
-- les 15 min, toute la journée — app/api/cron/stagnation-escalation décide
-- maintenant elle-même si on est dans la fenêtre 19h00-19h15 Paris.
select cron.unschedule('stagnation-escalation')
where exists (select 1 from cron.job where jobname = 'stagnation-escalation');

select cron.schedule(
  'stagnation-escalation',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/stagnation-escalation',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);

-- ── weekly-progress-recap ─────────────────────────────────────────────────
-- Avant : '0 18 * * 0' (une fois/semaine, décalage UTC figé). Après : toutes
-- les heures, uniquement le dimanche (le champ jour-de-semaine de pg_cron
-- reste en UTC, mais la fenêtre cible (soirée) tombe toujours dans le même
-- dimanche UTC, jamais à cheval sur minuit) — app/api/cron/weekly-progress-recap
-- décide maintenant elle-même si on est dans la fenêtre 18h00-19h00 Paris.
select cron.unschedule('weekly-progress-recap')
where exists (select 1 from cron.job where jobname = 'weekly-progress-recap');

select cron.schedule(
  'weekly-progress-recap',
  '0 * * * 0',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/weekly-progress-recap',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);

-- ── weekly-sleep-recap ────────────────────────────────────────────────────
-- Ce job (jobid 22 en prod, schedule '0 19 * * 0') n'avait jamais eu de
-- migration commitée jusqu'ici (enregistré directement en base, découvert
-- en auditant les routes app/api/cron/* pour l'Axe 10 coach-assistant —
-- voir 20260819g_coach_assistant_cron.sql et MASTERCLASS.md Axe AU, qui
-- notent sa découverte et le doublon avec l'entrée vercel.json historique
-- déjà retirée). Cette migration comble donc aussi ce manque, en plus du
-- même correctif DST que les autres jobs ci-dessus : toutes les heures,
-- uniquement le dimanche — app/api/cron/weekly-sleep-recap décide
-- maintenant elle-même si on est dans la fenêtre 19h00-20h00 Paris.
select cron.unschedule('weekly-sleep-recap')
where exists (select 1 from cron.job where jobname = 'weekly-sleep-recap');

select cron.schedule(
  'weekly-sleep-recap',
  '0 * * * 0',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/weekly-sleep-recap',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
