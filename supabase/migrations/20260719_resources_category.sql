-- Categorie sur les ressources — la liste client etait un unique flux plat
-- (le PDF le plus recent en premier), impossible a parcourir une fois
-- qu'il y a plus de quelques guides. Une categorie simple permet de
-- regrouper l'affichage cote client (Entrainement, Nutrition, Mental...).

ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS category text;
