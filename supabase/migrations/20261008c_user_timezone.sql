-- Fuseau horaire de chaque personne (2026-10-08), détecté sur son appareil,
-- utilisé par les rappels d'agenda et les rappels pour partir à SON heure.
alter table public.user_settings add column if not exists timezone text;
