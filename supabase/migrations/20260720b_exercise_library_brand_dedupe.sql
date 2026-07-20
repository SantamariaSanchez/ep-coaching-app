-- Le seed officiel generait 12 exercices machine x 12 marques (144 lignes,
-- ex. "Développé pectoraux assis : Hammer Strength" / ": Cybex" / ...),
-- quasi-identiques (memes instructions) et en plus doublons d'un exercice
-- générique deja present ("Développé pectoraux assis machine"). Supprime
-- ces 144 lignes deja importees en base ; le seed source
-- (lib/exercise-library-seed.ts) a ete corrige pour ne plus les generer.
-- Le champ "brand" reste utilisable, juste plus comme generateur de doublons.

DELETE FROM public.exercise_library
WHERE is_official = true
  AND brand IS NOT NULL
  AND name LIKE '%: %';
