-- Le créateur de repas (MealCreatorWizard/lib/meal-creator.ts) calcule déjà
-- des quantités réelles par aliment du catalogue (food_id + grammes) pour
-- atteindre les macros ciblées, mais ne gardait que le texte formaté
-- ("150g de blanc de poulet") — la donnée structurée était perdue. La
-- conserver permet de loguer une recette générée en un clic dans le suivi
-- du jour (Journal alimentaire), plutôt que ressaisir chaque ingrédient à
-- la main. Optionnel : les recettes créées via le formulaire libre
-- (AddRecipeForm) ou du catalogue statique n'ont pas cette donnée.
alter table community_recipes
  add column if not exists foods_used jsonb;

comment on column community_recipes.foods_used is 'Aliments structurés utilisés ([{food_id, grams}]) quand la recette vient du créateur de repas — permet de "Loguer aujourd''hui" en un clic.';
