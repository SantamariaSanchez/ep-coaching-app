-- Force, powerlifting, street workout et calisthenics (2026-10-21).
-- Migration rejouable : ajoute les mouvements clés manquants à la bibliothèque,
-- sans écraser l'existant (un exercice déjà présent sous le même nom est ignoré),
-- et les champs de progression (skill_key, skill_step) pour suivre l'étape de skill.

alter table public.exercise_library
  add column if not exists skill_key text,
  add column if not exists skill_step smallint;

insert into public.exercise_library (name, muscle_group, muscle_subgroup, equipment, category, difficulty, instructions, skill_key, skill_step, is_official)
select v.name, v.muscle_group, v.muscle_subgroup, v.equipment, v.category, v.difficulty, v.instructions, v.skill_key, v.skill_step, true
from (values
  ('Squat pause (arrêt 2 s en bas)', 'Quadriceps', 'Quadriceps', 'Barre', 'compose', 'avance', 'Descends, marque 2 secondes en bas sans relâcher la tension, remonte. Travaille la sortie du trou.', null::text, null::smallint),
  ('Squat tempo 3-1-0', 'Quadriceps', 'Quadriceps', 'Barre', 'compose', 'intermediaire', '3 secondes de descente contrôlée, 1 seconde en bas, montée à vitesse normale.', null::text, null::smallint),
  ('Squat barre basse (low bar)', 'Quadriceps', 'Fessiers', 'Barre', 'compose', 'avance', 'Barre sur les deltoïdes postérieurs, buste plus penché, hanches en arrière. Position de powerlifting.', null::text, null::smallint),
  ('Squat barre haute (high bar)', 'Quadriceps', 'Quadriceps', 'Barre', 'compose', 'intermediaire', 'Barre sur les trapèzes, buste plus vertical, genoux en avant. Position haltéro et bodybuilding.', null::text, null::smallint),
  ('Squat avec chaînes', 'Quadriceps', 'Fessiers', 'Barre', 'compose', 'avance', 'Les chaînes alourdissent la barre en haut du mouvement : le haut du squat devient le plus dur.', null::text, null::smallint),
  ('Squat avec bandes élastiques', 'Quadriceps', 'Fessiers', 'Barre', 'compose', 'avance', 'Bandes fixées au rack : résistance croissante, travaille l''accélération en fin de montée.', null::text, null::smallint),
  ('Squat 1 et 1/4', 'Quadriceps', 'Quadriceps', 'Barre', 'compose', 'avance', 'Descends, remonte au quart, redescends, puis remonte complètement. Compte pour 1 répétition.', null::text, null::smallint),
  ('Développé couché pause (arrêt poitrine)', 'Pectoraux', 'Chef sternal', 'Barre', 'compose', 'intermediaire', 'Marque 1 à 2 secondes barre posée sur la poitrine, comme en compétition, puis pousse sur ordre.', null::text, null::smallint),
  ('Développé couché tempo 3-1-0', 'Pectoraux', 'Chef sternal', 'Barre', 'compose', 'intermediaire', '3 secondes de descente, 1 seconde de pause poitrine, puis poussée.', null::text, null::smallint),
  ('Développé couché avec chaînes', 'Pectoraux', 'Chef sternal', 'Barre', 'compose', 'avance', 'Les chaînes alourdissent la barre en haut de la poussée : travail du verrouillage.', null::text, null::smallint),
  ('Développé couché avec bandes élastiques', 'Pectoraux', 'Chef sternal', 'Barre', 'compose', 'avance', 'Bandes fixées au rack : résistance croissante, travaille l''accélération.', null::text, null::smallint),
  ('Développé couché Spoto press', 'Pectoraux', 'Chef sternal', 'Barre', 'compose', 'avance', 'Descends la barre à 2-3 cm de la poitrine, marque une pause sans la toucher, puis pousse.', null::text, null::smallint),
  ('Développé couché pin press (butées)', 'Pectoraux', 'Chef sternal', 'Barre', 'compose', 'avance', 'Barre posée sur des butées du rack à hauteur choisie : repart de zéro, travaille un point faible.', null::text, null::smallint),
  ('Développé couché floor press', 'Pectoraux', 'Chef sternal', 'Barre', 'compose', 'intermediaire', 'Allongé au sol, coudes qui touchent le sol en bas. Limite l''amplitude, cible les triceps et le verrouillage.', null::text, null::smallint),
  ('Développé couché board press', 'Pectoraux', 'Chef sternal', 'Barre', 'compose', 'avance', 'Une planche posée sur la poitrine réduit l''amplitude : surcharge le haut de la poussée.', null::text, null::smallint),
  ('Soulevé de terre pause (arrêt sous le genou)', 'Dos', 'Érecteurs (lombaire)', 'Barre', 'compose', 'avance', 'Monte la barre, marque 1 à 2 secondes sous le genou en gardant le dos plat, puis termine.', null::text, null::smallint),
  ('Soulevé de terre déficit', 'Dos', 'Érecteurs (lombaire)', 'Barre', 'compose', 'avance', 'Debout sur une plateforme de 3-5 cm : amplitude plus longue, travaille le décollage.', null::text, null::smallint),
  ('Soulevé de terre tempo 3-0-0', 'Dos', 'Érecteurs (lombaire)', 'Barre', 'compose', 'avance', 'Montée normale, descente en 3 secondes en gardant la barre collée au corps.', null::text, null::smallint),
  ('Soulevé de terre avec chaînes', 'Dos', 'Érecteurs (lombaire)', 'Barre', 'compose', 'avance', 'Les chaînes alourdissent le haut du mouvement : travail du verrouillage des hanches.', null::text, null::smallint),
  ('Soulevé de terre avec bandes élastiques', 'Dos', 'Érecteurs (lombaire)', 'Barre', 'compose', 'avance', 'Bandes fixées au sol : résistance croissante, accélération jusqu''au verrouillage.', null::text, null::smallint),
  ('Développé militaire pause', 'Épaules', 'Faisceau antérieur', 'Barre', 'compose', 'intermediaire', 'Marque 1 seconde barre posée sur les clavicules, puis pousse sans élan.', null::text, null::smallint),
  ('Tractions prise neutre', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'intermediaire', 'Mains face à face (barres parallèles ou poignées), tire jusqu''au menton au-dessus de la barre.', null::text, null::smallint),
  ('Tractions élastique (assistées)', 'Dos', 'Grand dorsal', 'Élastique', 'compose', 'debutant', 'Élastique sous les pieds ou les genoux : choisis la bande qui permet 5 à 8 reps propres. Réduis l''aide au fil des semaines.', null::text, null::smallint),
  ('Tractions négatives', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'debutant', 'Monte sur un support, menton au-dessus de la barre, descends en 4 à 6 secondes. Première étape vers la traction stricte.', null::text, null::smallint),
  ('Tractions archer', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Tire d''un côté en gardant l''autre bras tendu. Progression vers la traction à un bras.', 'one_arm_pullup', 1),
  ('Tractions typewriter', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Menton au-dessus de la barre, déplace le corps d''un côté à l''autre sans descendre.', null::text, null::smallint),
  ('Tractions explosives (poitrine à la barre)', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Tire vite et haut pour amener la poitrine à la barre. Base du muscle-up.', null::text, null::smallint),
  ('Traction à un bras assistée', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Une main sur la barre, l''autre tient un élastique ou le poignet. Réduis l''aide progressivement.', 'one_arm_pullup', 2),
  ('Traction à un bras négative', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Monte avec deux bras, descends en 5 secondes sur un seul.', 'one_arm_pullup', 3),
  ('Tractions australiennes pieds surélevés', 'Dos', 'Rhomboïdes', 'Poids du corps', 'compose', 'intermediaire', 'Corps gainé sous une barre basse, pieds sur un banc : plus dur que les australiennes classiques.', null::text, null::smallint),
  ('Tractions prise large', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Mains bien plus larges que les épaules, tire la poitrine vers la barre.', null::text, null::smallint),
  ('Dips lestés', 'Triceps', 'Triceps', 'Poids du corps', 'compose', 'avance', 'Dips aux barres parallèles avec ceinture de lest. Ajoute 2,5 kg quand 3 x 8 sont propres.', null::text, null::smallint),
  ('Dips assistés élastique', 'Triceps', 'Triceps', 'Élastique', 'compose', 'debutant', 'Élastique tendu entre les barres ou sous les genoux. Réduis l''aide progressivement.', null::text, null::smallint),
  ('Dips négatifs', 'Triceps', 'Triceps', 'Poids du corps', 'compose', 'debutant', 'Descends en 4 à 5 secondes depuis la position haute, remonte avec les pieds ou en sautant.', null::text, null::smallint),
  ('Dips aux barres parallèles (poids du corps)', 'Pectoraux', 'Chef sternal', 'Poids du corps', 'compose', 'intermediaire', 'Épaules basses, descends jusqu''à 90° au coude, pousse sans verrouiller brutalement.', null::text, null::smallint),
  ('Muscle-up négatif', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Depuis le haut au-dessus de la barre, descends lentement en passant la transition en sens inverse.', 'muscle_up', 1),
  ('Muscle-up avec élastique', 'Dos', 'Grand dorsal', 'Élastique', 'compose', 'avance', 'Élastique sous les pieds : aide la transition. Réduis la bande au fil des séances.', 'muscle_up', 2),
  ('Muscle-up kipping', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Balancement du corps pour passer la transition. Garde la poitrine proche de la barre.', 'muscle_up', 3),
  ('Muscle-up strict', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Sans élan : traction explosive puis transition et dips. Demande environ 12 tractions et 20 dips.', 'muscle_up', 4),
  ('Muscle-up lesté', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Muscle-up strict avec gilet ou ceinture de lest.', 'muscle_up', 5),
  ('Transition muscle-up (barre basse)', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'intermediaire', 'Sur une barre basse, travaille le passage des poignets et du buste au-dessus de la barre.', null::text, null::smallint),
  ('Pompes archer', 'Pectoraux', 'Chef sternal', 'Poids du corps', 'compose', 'intermediaire', 'Mains très larges, descends sur un bras en gardant l''autre tendu. Progression vers la pompe à un bras.', null::text, null::smallint),
  ('Pompes explosives (claquées)', 'Pectoraux', 'Chef sternal', 'Poids du corps', 'compose', 'intermediaire', 'Pousse assez fort pour décoller les mains du sol, reçois en souplesse.', null::text, null::smallint),
  ('Pompes pike', 'Épaules', 'Faisceau antérieur', 'Poids du corps', 'compose', 'intermediaire', 'Hanches en l''air, corps en V inversé, descends la tête entre les mains. Base des pompes en équilibre.', 'hspu', 1),
  ('Pompes pike pieds surélevés', 'Épaules', 'Faisceau antérieur', 'Poids du corps', 'compose', 'intermediaire', 'Pieds sur un banc : plus vertical, plus proche du handstand push-up.', 'hspu', 2),
  ('Pompes pseudo planche', 'Pectoraux', 'Chef claviculaire', 'Poids du corps', 'compose', 'avance', 'Mains à hauteur des hanches, épaules en avant des mains. Prépare la planche.', 'planche', 1),
  ('Pompes à un bras (progression)', 'Pectoraux', 'Chef sternal', 'Poids du corps', 'compose', 'avance', 'Pieds écartés, une main dans le dos ou sur le côté. Avance par étapes : surélevée puis au sol.', null::text, null::smallint),
  ('Handstand contre le mur (dos au mur)', 'Épaules', 'Faisceau antérieur', 'Poids du corps', 'compose', 'intermediaire', 'Monte les pieds au mur, corps le plus droit possible, regard entre les mains. Tiens 30 à 60 secondes.', 'handstand', 1),
  ('Handstand contre le mur (ventre au mur)', 'Épaules', 'Faisceau antérieur', 'Poids du corps', 'compose', 'intermediaire', 'Marche vers le mur jusqu''à avoir la poitrine collée : alignement plus propre qu''avec le dos au mur.', 'handstand', 2),
  ('Handstand libre', 'Épaules', 'Faisceau antérieur', 'Poids du corps', 'compose', 'avance', 'Équilibre sans appui, en corrigeant avec les doigts. Travaille d''abord les sorties de sécurité.', 'handstand', 3),
  ('Marche sur les mains', 'Épaules', 'Faisceau antérieur', 'Poids du corps', 'compose', 'avance', 'Une fois le handstand libre tenu 30 secondes, déplace-toi en petits pas.', 'handstand', 4),
  ('Pompes en équilibre contre le mur', 'Épaules', 'Faisceau antérieur', 'Poids du corps', 'compose', 'avance', 'Handstand push-up avec appui au mur, descends la tête au sol (ou sur un tapis épais).', 'hspu', 3),
  ('Pompes en équilibre libres', 'Épaules', 'Faisceau antérieur', 'Poids du corps', 'compose', 'avance', 'Handstand push-up sans appui, très exigeant en équilibre et en force.', 'hspu', 4),
  ('Front lever tuck', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Suspendu, genoux serrés contre la poitrine, dos parallèle au sol, bras tendus. Tiens 10 à 15 secondes.', 'front_lever', 1),
  ('Front lever advanced tuck', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Comme le tuck mais dos plat et hanches ouvertes à 90°. Tiens 10 secondes.', 'front_lever', 2),
  ('Front lever une jambe', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Une jambe tendue, l''autre repliée. Étape entre advanced tuck et straddle.', 'front_lever', 3),
  ('Front lever straddle', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Jambes tendues et écartées, corps horizontal. Tiens 8 à 10 secondes.', 'front_lever', 4),
  ('Front lever complet', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Corps tendu et horizontal, jambes jointes. Skill de référence du street workout.', 'front_lever', 5),
  ('Back lever tuck', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'intermediaire', 'Suspendu à l''envers puis basculé vers l''arrière, genoux repliés, bras tendus. Prépare bien les épaules avant.', 'back_lever', 1),
  ('Back lever advanced tuck', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Dos plat, hanches ouvertes. Tiens 10 secondes.', 'back_lever', 2),
  ('Back lever straddle', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Jambes écartées tendues, corps horizontal face au sol.', 'back_lever', 4),
  ('Back lever complet', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Corps tendu horizontal, jambes jointes, face au sol.', 'back_lever', 5),
  ('Planche lean', 'Épaules', 'Faisceau antérieur', 'Poids du corps', 'compose', 'intermediaire', 'Position de pompe, penche les épaules loin devant les mains, bras tendus. Tiens 15 à 30 secondes.', 'planche', 1),
  ('Planche straddle', 'Épaules', 'Faisceau antérieur', 'Poids du corps', 'compose', 'avance', 'Jambes écartées, corps horizontal sur les mains. Tiens 5 à 10 secondes.', 'planche', 4),
  ('Planche complète', 'Épaules', 'Faisceau antérieur', 'Poids du corps', 'compose', 'avance', 'Corps tendu horizontal, jambes jointes, appui sur les mains seulement.', 'planche', 5),
  ('L-sit au sol (parallettes)', 'Abdominaux', 'Grand droit', 'Poids du corps', 'compose', 'intermediaire', 'Bras tendus, jambes tendues à l''horizontale, bassin décollé. Tiens 10 à 20 secondes.', 'l_sit', 3),
  ('L-sit tuck', 'Abdominaux', 'Grand droit', 'Poids du corps', 'compose', 'debutant', 'Genoux repliés contre la poitrine, fesses décollées du sol. Première étape du L-sit.', 'l_sit', 1),
  ('L-sit une jambe', 'Abdominaux', 'Grand droit', 'Poids du corps', 'compose', 'intermediaire', 'Une jambe tendue à l''horizontale, l''autre repliée.', 'l_sit', 2),
  ('V-sit', 'Abdominaux', 'Grand droit', 'Poids du corps', 'compose', 'avance', 'Jambes tendues au-dessus de l''horizontale, bassin haut. Demande beaucoup de mobilité.', 'l_sit', 4),
  ('Drapeau humain (human flag) tuck', 'Abdominaux', 'Obliques', 'Poids du corps', 'compose', 'avance', 'Corps horizontal sur le côté, accroché à un poteau, genoux repliés. Première étape du drapeau.', 'human_flag', 1),
  ('Drapeau humain (human flag) straddle', 'Abdominaux', 'Obliques', 'Poids du corps', 'compose', 'avance', 'Jambes écartées, corps horizontal sur le côté.', 'human_flag', 2),
  ('Drapeau humain (human flag) complet', 'Abdominaux', 'Obliques', 'Poids du corps', 'compose', 'avance', 'Corps tendu et horizontal sur le côté, jambes jointes.', 'human_flag', 3),
  ('Pistol squat assisté', 'Quadriceps', 'Quadriceps', 'Poids du corps', 'compose', 'intermediaire', 'Tiens un poteau ou un TRX. Descends sur une jambe, l''autre tendue devant. Réduis l''aide au fil des semaines.', 'pistol', 1),
  ('Pistol squat sur box', 'Quadriceps', 'Quadriceps', 'Poids du corps', 'compose', 'intermediaire', 'Assieds-toi sur une box sur une jambe, relève-toi sans élan. Baisse la box progressivement.', 'pistol', 2),
  ('Pistol squat lesté', 'Quadriceps', 'Quadriceps', 'Poids du corps', 'compose', 'avance', 'Pistol complet avec un haltère contre la poitrine.', 'pistol', 4),
  ('Shrimp squat', 'Quadriceps', 'Quadriceps', 'Poids du corps', 'compose', 'avance', 'Sur une jambe, le pied arrière tenu derrière toi, genou qui touche le sol. Alternative au pistol.', null::text, null::smallint),
  ('Dragon flag négatif', 'Abdominaux', 'Grand droit', 'Poids du corps', 'compose', 'avance', 'Depuis le haut, descends le corps tendu en 4 à 5 secondes en gardant le bassin aligné.', null::text, null::smallint),
  ('Relevé de genoux suspendu', 'Abdominaux', 'Grand droit', 'Poids du corps', 'compose', 'debutant', 'Suspendu à la barre, monte les genoux vers la poitrine sans balancer.', null::text, null::smallint),
  ('Support aux anneaux (ring support)', 'Épaules', 'Faisceau antérieur', 'Poids du corps', 'compose', 'intermediaire', 'Bras tendus, anneaux tournés vers l''extérieur, tiens 20 à 30 secondes. Base des skills aux anneaux.', null::text, null::smallint),
  ('Suspension active (active hang)', 'Avant-bras', 'Fléchisseurs', 'Poids du corps', 'isolation', 'debutant', 'Suspendu, omoplates tirées vers le bas, sans hausser les épaules aux oreilles. Tiens 20 à 40 secondes.', null::text, null::smallint),
  ('Skin the cat', 'Épaules', 'Faisceau antérieur', 'Poids du corps', 'compose', 'avance', 'Suspendu, passe les jambes entre les bras pour basculer à l''envers, puis reviens. Mobilité d''épaule et préparation du back lever.', 'back_lever', 3),
  ('Grenouille (frog stand)', 'Épaules', 'Faisceau antérieur', 'Poids du corps', 'compose', 'debutant', 'Genoux posés sur les coudes, transfert le poids sur les mains. Première étape de l''équilibre sur les mains.', 'handstand', 0)
) as v(name, muscle_group, muscle_subgroup, equipment, category, difficulty, instructions, skill_key, skill_step)
where not exists (select 1 from public.exercise_library e where lower(e.name) = lower(v.name));

-- Étapes de skill des exercices déjà présents (ne touche qu'aux champs vides).
update public.exercise_library set skill_key = 'muscle_up', skill_step = 4 where lower(name) = lower('Muscle-up à la barre') and skill_key is null;
update public.exercise_library set skill_key = 'muscle_up', skill_step = 4 where lower(name) = lower('Muscle-up aux anneaux') and skill_key is null;
update public.exercise_library set skill_key = 'front_lever', skill_step = 4 where lower(name) = lower('Front lever (position)') and skill_key is null;
update public.exercise_library set skill_key = 'front_lever', skill_step = 3 where lower(name) = lower('Front lever tirage') and skill_key is null;
update public.exercise_library set skill_key = 'planche', skill_step = 5 where lower(name) = lower('Planche (position statique)') and skill_key is null;
update public.exercise_library set skill_key = 'planche', skill_step = 2 where lower(name) = lower('Planche progression tuck (genou au coffre)') and skill_key is null;
update public.exercise_library set skill_key = 'planche', skill_step = 3 where lower(name) = lower('Planche progression advanced tuck') and skill_key is null;
update public.exercise_library set skill_key = 'l_sit', skill_step = 3 where lower(name) = lower('L-sit (position)') and skill_key is null;
update public.exercise_library set skill_key = 'back_lever', skill_step = 5 where lower(name) = lower('Back lever (position)') and skill_key is null;
update public.exercise_library set skill_key = 'pistol', skill_step = 3 where lower(name) = lower('Pistol squat') and skill_key is null;
update public.exercise_library set skill_key = 'hspu', skill_step = 3 where lower(name) = lower('Pompes en appui renversé (HSPU)') and skill_key is null;
update public.exercise_library set skill_key = 'hspu', skill_step = 4 where lower(name) = lower('Pompes en appui renversé strict') and skill_key is null;
