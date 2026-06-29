-- Mode "off-season" vs "prep" pour les compétiteurs — bascule manuelle qui
-- change l'affichage (nutrition, conseils mindset), aucun impact fonctionnel
-- caché. Réutilisable aussi par les membres gratuits qui se gèrent seuls.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS season_mode text CHECK (season_mode IN ('off_season', 'prep')) DEFAULT 'off_season';
