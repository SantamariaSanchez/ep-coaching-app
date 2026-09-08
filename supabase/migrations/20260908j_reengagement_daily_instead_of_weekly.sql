-- La séquence de relance des membres dormants (app/api/cron/weekly-
-- reengagement) tournait un seul jour par semaine (lundi 15h UTC). Sa vraie
-- garde anti-spam est déjà le cooldown de 6 jours par personne
-- (MIN_DAYS_BETWEEN_MESSAGES, voir lib/reengagement.ts) — la fréquence du
-- cron lui-même ne fait que déterminer le délai MAXIMUM avant le tout
-- premier message à un nouveau membre inactif, pas la fréquence des
-- relances individuelles.
--
-- Avec un passage hebdomadaire, quelqu'un qui s'inscrivait le mardi et ne
-- faisait rien attendait jusqu'à 6 jours avant le premier email/push,
-- exactement pendant la fenêtre où l'intérêt est le plus fort et où une
-- vraie première action (séance, repas, bilan) a le plus de chances de se
-- transformer en habitude. Passage à un passage quotidien : le premier
-- message part dans les ~24h suivant l'inscription au lieu de jusqu'à 7
-- jours, sans changer le rythme des relances suivantes (toujours cadencées
-- par le cooldown de 6 jours).
--
-- Le nom du job/de la route reste "weekly-reengagement" (identifiant déjà
-- utilisé ailleurs dans le code et les commentaires) même s'il tourne
-- désormais tous les jours — renommer casserait plus qu'il ne clarifierait
-- pour un simple changement de fréquence.
--
-- Appliquée en prod le 2026-09-08 (migration cadmwvrsjklgtrrebflz
-- reengagement_daily_instead_of_weekly), ce fichier rejoint le repo après
-- coup.

select cron.unschedule('weekly-reengagement')
where exists (select 1 from cron.job where jobname = 'weekly-reengagement');

select cron.schedule(
  'weekly-reengagement',
  '0 15 * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/weekly-reengagement',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
