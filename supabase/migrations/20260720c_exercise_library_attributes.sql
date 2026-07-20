-- Attributs de classification exercice — utilises uniquement cote coach
-- (picker de construction de programme), jamais affiches au client pendant
-- une seance. Echelle qualitative "+" / "++" / "+++" en texte libre pour
-- rester simple a remplir (pas de contrainte stricte, le coach ne remplit
-- pas forcement tout pour chaque exercice).

ALTER TABLE public.exercise_library
  ADD COLUMN IF NOT EXISTS position text,
  ADD COLUMN IF NOT EXISTS freedom_of_movement text,
  ADD COLUMN IF NOT EXISTS is_unilateral boolean,
  ADD COLUMN IF NOT EXISTS microloadable boolean,
  ADD COLUMN IF NOT EXISTS easy_to_replicate text,
  ADD COLUMN IF NOT EXISTS learning_difficulty text,
  ADD COLUMN IF NOT EXISTS stability_demand text,
  ADD COLUMN IF NOT EXISTS accessibility text;
