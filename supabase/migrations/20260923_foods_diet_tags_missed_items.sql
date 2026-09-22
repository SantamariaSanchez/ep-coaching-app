-- Suite immédiate de 20260922_foods_diet_tags_allergens.sql (Axe FG,
-- MASTERCLASS.md) : 5 aliments oubliés par erreur de couverture (pas des
-- cas ambigus volontaires) — vérifié en relisant la liste des lignes
-- restées NULL après le premier passage :
--   - "Baguette" (catégorie Cereales, distincte de "Baguette tradition"
--     dans Feculents qui elle avait bien été traitée)
--   - "Avocat" (catégorie "Matière grasse" — fruit, vegan, oublié de la
--     liste d'huiles de cette catégorie)
--   - "Miel de manuka" / "Miel toutes fleurs" (catégorie Sucreries — seul
--     "Miel" dans la catégorie Sucrant avait été traité)
--   - "Whey" nu (catégorie Complements, après son recatégorisation depuis
--     "Viandes" — seules les variantes aromatisées "Whey chocolat" etc.
--     avaient été listées)

update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien'], allergens = array['gluten']
where category = 'Cereales' and name = 'Baguette';

update public.foods set diet_tags = array['omnivore','vegetarien','vegan','pescetarien']
where category = 'Matière grasse' and name = 'Avocat';

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien']
where category = 'Sucreries' and name = any (array['Miel de manuka','Miel toutes fleurs']);

update public.foods set diet_tags = array['omnivore','pescetarien','vegetarien'], allergens = array['lactose']
where category = 'Complements' and name = 'Whey';
