-- Permet a un repas d'avoir 2-3 variantes interchangeables (ex: matin,
-- flocons d'avoine OU pain) au lieu d'une seule composition figee.
-- NULL = comportement historique (aliment du repas "principal", compte
-- dans les totaux macro). Une valeur >= 2 marque une option alternative,
-- exclue des totaux macro/liste de courses (evite de compter les 2
-- variantes comme si le client mangeait les deux).
alter table diet_plan_meals add column if not exists variant_group smallint;
alter table diet_plan_template_meals add column if not exists variant_group smallint;

comment on column diet_plan_meals.variant_group is
  'NULL ou 1 = repas principal (compte dans les totaux). >=2 = variante alternative interchangeable, affichee mais exclue des totaux macro.';
