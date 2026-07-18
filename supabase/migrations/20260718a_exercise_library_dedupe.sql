-- Nettoyage de doublons dans exercise_library — deux exercices quasi
-- identiques (même groupe/sous-groupe/matériel/catégorie/difficulté,
-- description quasi identique) avaient été ajoutés sous deux noms
-- différents dans deux migrations de seed successives.

DELETE FROM public.exercise_library
WHERE name = 'Extension corde poulie basse unilatérale'
  AND EXISTS (
    SELECT 1 FROM public.exercise_library
    WHERE name = 'Extension poulie basse unilatérale'
  );
