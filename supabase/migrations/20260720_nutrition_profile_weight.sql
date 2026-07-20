-- Le poids utilise pour calculer le TDEE n'etait jamais persiste : le champ
-- du formulaire servait seulement au calcul affiche a l'ecran, puis etait
-- systematiquement ecrase au rechargement par le dernier poids logge par le
-- client (getLatestWeight). Impossible pour le coach de fixer une valeur
-- differente qui tienne apres sauvegarde.

ALTER TABLE public.nutrition_profiles
  ADD COLUMN IF NOT EXISTS weight numeric;
