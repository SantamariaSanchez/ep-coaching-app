-- Ajoute la marque de machine (Hammer Strength, Cybex, Nautilus, etc.) sur
-- chaque exercice — une seule colonne à ajouter, pas de données à coller :
-- utilise ensuite le bouton "Importer la bibliothèque officielle" dans
-- l'appli pour charger les ~144 variantes par marque.
ALTER TABLE public.exercise_library
  ADD COLUMN IF NOT EXISTS brand text;
