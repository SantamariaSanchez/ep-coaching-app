-- Chantier egress Supabase (crise de quota, voir MASTERCLASS.md) : le
-- projet est actuellement bloqué (402 Payment Required sur 100% des
-- appels REST, vérifié par les logs) jusqu'au renouvellement du cycle le
-- 2026-09-27. En attendant, réduit la fréquence des crons non critiques
-- qui tournaient 24/7 même sans aucun client payant actif, pour ne pas
-- re-consommer le quota trop vite une fois le service rétabli.
--
-- Utilise cron.alter_job (pas unschedule/schedule) pour ne modifier QUE le
-- champ schedule, sans toucher au champ command déjà en place — celui-ci
-- contient le vrai CRON_SECRET en clair, jamais un placeholder, contrairement
-- aux fichiers de migration d'origine (voir 20260712b_live_reminders_cron.sql
-- par exemple) : le recréer via cron.schedule aurait remplacé ce secret réel
-- par le placeholder du fichier et cassé le cron silencieusement.
--
-- Jobs volontairement LAISSÉS INTACTS (précision utilisateur critique) :
-- - schedule-block-notify (*/5) : porte l'alarme "réveil qui sonne vraiment"
--   avec une logique d'escalade explicitement construite sur un pas de 5 min
--   (voir app/api/cron/schedule-block-notify/route.ts) — y toucher recasserait
--   une fonctionnalité déjà corrigée après plusieurs retours directs.
-- - live-reminders-24h (horaire) : déjà assez espacé.
-- - tous les crons quotidiens/hebdomadaires (0 X * * *, etc.) : déjà peu
--   fréquents, aucun gain significatif à en tirer.

-- live-reminders : */5 -> */10 (fenêtre de rappel déjà large de 15 min,
-- voir REMINDER_WINDOW_MINUTES dans app/api/cron/live-reminders/route.ts —
-- aucun live ne peut être manqué avec ce nouveau pas).
select cron.alter_job(job_id := 6, schedule := '*/10 * * * *')
where exists (select 1 from cron.job where jobid = 6 and jobname = 'live-reminders');

-- meal-reminders : */15 -> */20 (fenêtre élargie en conséquence côté code,
-- voir app/api/cron/meal-reminders/route.ts, commit du même jour).
select cron.alter_job(job_id := 20, schedule := '*/20 * * * *')
where exists (select 1 from cron.job where jobid = 20 and jobname = 'meal-reminders');

-- nag-client-tasks : */10 -> */20 (relance différée de quelques minutes de
-- plus tant qu'une tâche n'est pas cochée, sans impact fonctionnel).
select cron.alter_job(job_id := 1, schedule := '*/20 * * * *')
where exists (select 1 from cron.job where jobid = 1 and jobname = 'nag-client-tasks');

-- send-client-reminders : */10 -> */20 (même logique de rattrapage que
-- schedule-block-notify côté "rappel du jour", sans fenêtre stricte à
-- respecter — voir app/api/cron/send-reminders/route.ts).
select cron.alter_job(job_id := 2, schedule := '*/20 * * * *')
where exists (select 1 from cron.job where jobid = 2 and jobname = 'send-client-reminders');
