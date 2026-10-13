-- Studio créatif (2026-10-13) : quand un script est réécrit avec le
-- vocabulaire du dictionnaire (bouton « Réécrire avec le vocabulaire » ou
-- « Tout mettre à jour »), l'ancienne version est gardée ici, au cas où.
-- Sans cette colonne la réécriture marche quand même, sans copie de secours.
alter table public.coach_scripts add column if not exists previous_version jsonb;
