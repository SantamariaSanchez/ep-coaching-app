-- Axe 5 (VISION.md) : étiquettes de spécialisation sur le profil coach,
-- pour un annuaire public filtrable par objectif/contrainte du membre.
alter table profiles
  add column if not exists specializations text[] not null default '{}'::text[];

comment on column profiles.specializations is
  'Étiquettes de spécialisation du coach (voir lib/coach-specializations.ts). Vide = pas encore renseigné, traité comme "Généraliste" par défaut côté annuaire public.';

create index if not exists idx_profiles_specializations
  on profiles using gin (specializations);
