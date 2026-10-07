-- La langue n'est enregistrée que si la personne l'a choisie : sans choix,
-- l'appli suit la langue du téléphone (lib/i18n-server.ts).
alter table public.user_settings alter column locale drop default;
alter table public.user_settings alter column locale drop not null;
