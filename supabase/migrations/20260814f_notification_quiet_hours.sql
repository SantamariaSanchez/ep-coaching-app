-- Item 50 (chantier 50 idées) : heures de silence pour les notifications
-- push. Colonnes sur push_subscriptions (pas profiles) : une seule ligne
-- par utilisateur, déjà relue à chaque envoi de push (sendPushToUser) —
-- aucune requête supplémentaire nécessaire pour appliquer la règle.
-- NULL = pas de préférence explicite, l'appli applique un défaut
-- raisonnable (22h-7h) côté code plutôt qu'en base.
alter table public.push_subscriptions add column if not exists quiet_hours_start smallint;
alter table public.push_subscriptions add column if not exists quiet_hours_end smallint;
