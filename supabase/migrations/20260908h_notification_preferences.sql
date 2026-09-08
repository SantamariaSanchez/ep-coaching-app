-- Réglage granulaire des notifications push (voir lib/notification-preferences.ts).
-- Jusqu'ici, la seule option était tout ou rien (activer/désactiver le push
-- au niveau du navigateur) plus les heures de silence — aucun moyen de dire
-- "je veux garder les messages de mon coach mais couper la communauté".
--
-- Appliquée en prod le 2026-09-08 (migration cadmwvrsjklgtrrebflz
-- notification_preferences), ce fichier rejoint le repo après coup.

alter table public.profiles add column if not exists notification_preferences jsonb not null default '{}'::jsonb;

comment on column public.profiles.notification_preferences is
  'Categories de notification PUSH desactivees par l''utilisateur (ex: {"communaute": true} = communaute coupee). Vide = tout active. Ne coupe jamais la notif in-app (cloche), ni les categories "essentiel" (facturation, relances de retention). Voir lib/notification-preferences.ts.';
