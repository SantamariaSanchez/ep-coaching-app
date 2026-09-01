-- Reveil sans son reel (retour direct 2026-09-01 : "jai les notif mais ya pas
-- de son et pour le reveil pareil jai pas ete reveiller car seulement notif
-- sans son"). silent:false, vibrate agressif et requireInteraction sont deja
-- au maximum de ce que l'API Web Push permet (voir public/sw.js) : le son
-- reel d'un vrai reveil ne peut jouer que si un onglet de l'appli est ouvert
-- (AlarmPlayer.tsx, Web Audio). Sans onglet ouvert (cas normal a 4h du matin,
-- telephone verrouille), ni Apple ni Android ne laissent un service worker
-- jouer du son en tache de fond hors app ouverte : limite de plateforme,
-- pas quelque chose de contournable depuis le code de l'appli.
--
-- Le vrai levier qui reste cote code : au lieu d'un seul envoi qui peut etre
-- rate en dormant, on relance la notification/vibration toutes les 5 min
-- (cadence du cron schedule-block-notify) jusqu'a ce que le reveil soit
-- explicitement arrete (bouton "Arreter" ou action de la notification), avec
-- une limite de 30 min pour ne pas sonner indefiniment si jamais oublie.
alter table schedule_blocks
  add column if not exists alarm_ack_date date;

comment on column schedule_blocks.alarm_ack_date is 'Date (Europe/Paris) a laquelle ce bloc reveil a ete explicitement arrete par l''utilisateur. Tant que ce n''est pas la date du jour, app/api/cron/schedule-block-notify continue de relancer la notification toutes les 5 min (jusqu''a 30 min apres start_time).';
