-- Dépistage de la relation à l'alimentation (politique d'accompagnement
-- d'Emmanuel : pas de coaching nutritionnel en cas de trouble du comportement
-- alimentaire, orientation vers un professionnel de santé).
-- Réponse unique par personne, posée à l'onboarding ou au calculateur.
-- non | passe | actuel | incertain. NULL = jamais posée.
alter table public.profiles add column if not exists eating_relationship text;
alter table public.profiles drop constraint if exists profiles_eating_relationship_check;
alter table public.profiles add constraint profiles_eating_relationship_check
  check (eating_relationship is null or eating_relationship in ('non', 'passe', 'actuel', 'incertain'));
comment on column public.profiles.eating_relationship is 'Relation à l''alimentation déclarée : non, passe, actuel, incertain. actuel et incertain bloquent tout déficit chiffré (lib/eating-safety.ts).';
