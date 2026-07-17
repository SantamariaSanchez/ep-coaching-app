-- Carb cycling simple : objectif calorique/glucides qui varie selon le type
-- de jour (repos, high/refeed) plutôt qu'une cible unique fixe tous les
-- jours. Protéines et lipides restent stables, les glucides absorbent le
-- delta — pratique standard de carb cycling.
-- Exécute dans Supabase SQL Editor.

ALTER TABLE nutrition_profiles
  ADD COLUMN IF NOT EXISTS calories_offset_rest integer,
  ADD COLUMN IF NOT EXISTS calories_offset_high integer;
