-- Notes d'installation / adaptations matériel par exercice — distinct
-- d'"instructions" (comment exécuter le mouvement) : ici, comment
-- l'INSTALLER et l'ADAPTER selon le matériel réellement disponible
-- (ex. "Leg extension : ajouter un élastique en haut du mouvement si la
-- machine ne tient pas la tension en position raccourcie", "Tirage :
-- prévoir des sangles si prise de grip un facteur limitant avant le dos").
-- Coach-alimenté au fil de l'usage réel, jamais pré-rempli en masse : les
-- 642 exercices existants n'ont aucun des 7 attributs de classification
-- déjà en base (position, liberté de mouvement, unilatéral/bilatéral,
-- microchargeable, facilité de réplication, difficulté d'apprentissage,
-- exigence de stabilité, accessibilité) — plutôt que d'inventer des
-- valeurs à leur place, l'outil de conception permet de les évaluer et de
-- les enrichir directement pendant la construction d'un programme réel.
alter table public.exercise_library
  add column if not exists setup_notes text;
