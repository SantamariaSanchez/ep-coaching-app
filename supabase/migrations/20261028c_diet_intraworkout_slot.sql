-- Créneau « intra-entraînement » pour les diètes (boisson d'effort : maltodextrine,
-- EAA...), entre « preworkout » et « postworkout ». Sans cette migration le code
-- continue de marcher : l'intra reste rangé dans le créneau pré-entraînement.
-- À exécuter dans le Supabase SQL Editor (idempotent).
alter table public.diet_plan_meals drop constraint if exists diet_plan_meals_meal_slot_check;
alter table public.diet_plan_meals
  add constraint diet_plan_meals_meal_slot_check
  check (meal_slot in ('breakfast', 'morning', 'lunch', 'afternoon', 'preworkout', 'intraworkout', 'postworkout', 'dinner'));
