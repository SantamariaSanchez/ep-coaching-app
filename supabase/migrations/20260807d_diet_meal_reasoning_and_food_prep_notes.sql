-- Pourquoi CET aliment a été choisi pour CE repas précis d'un client précis
-- (appétit, praticité, remplace un aliment détesté, timing autour de
-- l'entraînement...) — une décision de conception, comme resistance_notes
-- côté exercices (migration 20260807_exercise_assignment_design_decisions).
-- Rien n'est déduit automatiquement, ça reste à écrire par le coach.
alter table diet_plan_meals
  add column if not exists notes text;
alter table diet_plan_template_meals
  add column if not exists notes text;

comment on column diet_plan_meals.notes is 'Pourquoi ce choix d''aliment pour ce repas précis (décision du coach, jamais déduite).';
comment on column diet_plan_template_meals.notes is 'Notes de conception génériques pour ce créneau de repas (le modèle n''a pas de client précis, mais peut porter un principe réutilisable).';

-- Référence générale sur l'aliment (partagée entre coachs, comme
-- exercise_library.setup_notes) : se cuisine comment, se mange froid ou
-- chaud, s'associe bien avec quoi, astuces de préparation/conservation.
alter table foods
  add column if not exists prep_notes text;

comment on column foods.prep_notes is 'Cuisson/préparation/association de cet aliment (chaud/froid, associations, conservation) — référence partagée entre coachs.';
