-- Le formulaire de profil enregistre un site web, mais la colonne n'existait pas.
alter table public.profiles add column if not exists website text
  check (website is null or char_length(website) <= 500);
