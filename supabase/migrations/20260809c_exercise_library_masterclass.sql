-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Masterclass bibliothèque d'exercices
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════
-- Constat (audité en direct sur la prod avant d'écrire cette migration) :
--   - 642 exercices, dont 173 doublons EXACTS (même nom + même groupe
--     musculaire, mêmes valeurs partout) — probablement le script de seed
--     rejoué deux fois à 23 minutes d'intervalle le 2026-06-29. Aucune
--     clé étrangère ne pointe vers exercise_library.id (la liaison avec
--     les programmes clients se fait par nom en texte libre), donc
--     supprimer les doublons est sans risque pour l'historique existant.
--   - Sur les 469 exercices restants après dédoublonnage : les champs de
--     classification (position, freedom_of_movement, is_unilateral,
--     microloadable, easy_to_replicate, learning_difficulty,
--     stability_demand, accessibility) et setup_notes n'étaient remplis
--     QUE sur 1 seul exercice (Pompes). C'est le vrai trou : le coach doit
--     aujourd'hui tout évaluer lui-même à chaque fois qu'il construit un
--     programme, alors que ces critères sont réutilisables et objectifs.
--   - video_url reste volontairement vide ici : impossible de garantir
--     des liens YouTube réels et à jour sans les vérifier un par un, un
--     lien inventé serait pire qu'un champ vide.
--
-- Portée de cette passe : dédoublonnage complet (tous les exercices), puis
-- classification complète des mouvements les plus fondamentaux et les plus
-- prescrits en pratique (compound lifts + isolations de référence par
-- groupe musculaire), avec leurs variantes de marque de machine (ex. "Hip
-- thrust — Gym80/Matrix/Cybex/...") capturées via ILIKE sur le nom de base
-- pour couvrir toutes les variantes en une seule mise à jour. Les
-- exercices plus périphériques (variantes très spécifiques, mouvements
-- d'haltérophilie avancés, strongman...) restent à enrichir dans une
-- prochaine passe — la bibliothèque était déjà étonnamment complète en
-- couverture brute (jusqu'aux mouvements olympiques et strongman), le
-- travail restant est surtout de la classification, pas de l'ajout.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Dédoublonnage ──────────────────────────────────────────────────────
-- Garde la ligne la plus ancienne de chaque paire (nom, groupe musculaire)
-- strictement identique, supprime le reste.

with ranked as (
  select id, row_number() over (
    partition by name, muscle_group
    order by created_at asc, id asc
  ) as rn
  from exercise_library
)
delete from exercise_library
where id in (select id from ranked where rn > 1);

-- ── 2. Corrige les 4 exercices ajoutés à la main sans info (typo comprise) ──

update exercise_library set
  name = 'Hip thrust',
  category = 'compose', difficulty = 'debutant',
  muscle_subgroup = 'Grand fessier',
  instructions = 'Dos calé contre un banc, barre ou machine chargée sur les hanches (protection mousse recommandée), pieds à plat écartés largeur bassin. Pousse par les talons pour monter le bassin jusqu''à extension complète des hanches, contraction max en haut 1 seconde, redescend contrôlé sans reposer complètement.',
  position = 'Raccourcie', freedom_of_movement = '+', is_unilateral = false, microloadable = true,
  easy_to_replicate = '+++', learning_difficulty = '++', stability_demand = '+', accessibility = '+++',
  setup_notes = 'Prévoir un tapis de protection sur la barre/l''appui pour le confort des hanches. Banc réglé assez bas pour permettre l''extension complète.'
where name = 'Hip trust' and muscle_group = 'Fessiers';

update exercise_library set
  name = 'Développé couché incliné Smith machine',
  category = 'compose', difficulty = 'debutant',
  muscle_subgroup = 'Chef claviculaire',
  instructions = 'Banc incliné 30-45° sous la Smith machine. Barre guidée verticalement : déverrouille en tournant les poignets, descend jusqu''au haut des pectoraux, pousse jusqu''à extension complète des bras sans verrouiller brutalement les coudes.',
  position = 'Étirée', freedom_of_movement = '+', is_unilateral = false, microloadable = true,
  easy_to_replicate = '+++', learning_difficulty = '+', stability_demand = '+', accessibility = '+++',
  setup_notes = 'Régler l''inclinaison du banc et sa position sous la barre AVANT de charger — la Smith machine ne bouge que verticalement.'
where name = 'DC incline smith' and muscle_group = 'Pectoraux';

update exercise_library set
  name = 'Machine à dips — Matrix',
  category = 'compose', difficulty = 'debutant', brand = 'Matrix', equipment = 'Machine',
  muscle_subgroup = 'Chef sternal',
  instructions = 'Assis, poignées au niveau des épaules, contre-poids réglé pour assister le mouvement. Descend en poussant le buste légèrement en avant pour cibler les pectoraux, jusqu''à un étirement confortable des épaules, puis pousse jusqu''à quasi-extension des bras.',
  position = 'Étirée', freedom_of_movement = '+', is_unilateral = false, microloadable = true,
  easy_to_replicate = '+++', learning_difficulty = '+', stability_demand = '+', accessibility = '++',
  setup_notes = 'Régler le contre-poids/l''assistance et la hauteur du siège avant de commencer.'
where name = 'Machine à Dips - Matrix' and muscle_group = 'Pectoraux';

update exercise_library set
  name = 'Extension triceps poulie',
  category = 'isolation', difficulty = 'debutant',
  muscle_subgroup = 'Chef latéral',
  instructions = 'Face à la poulie haute, barre ou corde en prise pronation, coudes serrés le long du corps. Pousse en étendant les avant-bras jusqu''à extension complète, sans décoller les coudes, puis remonte contrôlé jusqu''à un angle de 90°.',
  position = 'Raccourcie', freedom_of_movement = '++', is_unilateral = false, microloadable = true,
  easy_to_replicate = '+++', learning_difficulty = '+', stability_demand = '+', accessibility = '+++',
  setup_notes = 'Régler la poulie en position haute, choisir barre droite/EZ ou corde selon la prise recherchée.'
where name = 'Extension triceps poulie' and muscle_group = 'Triceps';

-- ── 3. Classification des mouvements fondamentaux ────────────────────────
-- Une ligne par mouvement de base ; ILIKE 'nom%' capture aussi toutes les
-- variantes de marque de machine (" — Gym80", " — Matrix", " — Cybex"...).

-- Quadriceps
update exercise_library set position='Milieu', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='+++', stability_demand='+++', accessibility='+++', setup_notes='Cage à squat avec crochets réglés à hauteur d''épaules, barres de sécurité positionnées juste sous l''amplitude basse.' where name ilike 'Squat barre (back squat)%' and muscle_group='Quadriceps';
update exercise_library set position='Milieu', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='+', learning_difficulty='+++', stability_demand='+++', accessibility='++', setup_notes='Barre posée sur les deltoïdes antérieurs, coudes hauts (prise croisée possible pour plus de confort d''épaule).' where name ilike 'Front squat%' and muscle_group='Quadriceps';
update exercise_library set position='Milieu', freedom_of_movement='++', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='+++', setup_notes='Régler l''inclinaison du dossier et la position des repose-pieds avant de charger.' where (name ilike 'Presse à cuisses%' or name ilike 'Leg press%') and muscle_group='Quadriceps';
update exercise_library set position='Étirée', freedom_of_movement='+', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='++', setup_notes='Régler le dossier incliné et le point de contact des épaules pour que le buste reste vertical pendant la descente.' where name ilike 'Hack squat%' and muscle_group='Quadriceps';
update exercise_library set position='Raccourcie', freedom_of_movement='+', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='+++', setup_notes='Régler l''axe de rotation du genou aligné avec celui de la machine, dossier ajusté pour ne pas décoller le bassin.' where name ilike 'Leg extension%' and muscle_group='Quadriceps';
update exercise_library set position='Milieu', freedom_of_movement='+++', is_unilateral=true, microloadable=true, easy_to_replicate='+', learning_difficulty='++', stability_demand='+++', accessibility='+++', setup_notes='Pied arrière surélevé sur un banc (banc bulgare) ou au sol selon la variante ; charge tenue en haltères le long du corps.' where name ilike 'Fentes bulgares%' and muscle_group='Quadriceps';
update exercise_library set position='Milieu', freedom_of_movement='+++', is_unilateral=true, microloadable=true, easy_to_replicate='+', learning_difficulty='++', stability_demand='+++', accessibility='+++', setup_notes='Prévoir assez d''espace pour marcher ; démarrer sans charge pour caler l''équilibre.' where (name ilike 'Fentes avant%' or name ilike 'Fente marchée%' or name ilike 'Fentes marchées%') and muscle_group='Quadriceps';
update exercise_library set position='Milieu', freedom_of_movement='+++', is_unilateral=true, microloadable=false, easy_to_replicate='+', learning_difficulty='+++', stability_demand='+++', accessibility='+++', setup_notes='Progression : commencer assisté (TRX, porte) avant la version libre. Amplitude complète non obligatoire au début.' where name ilike 'Pistol squat%' and muscle_group='Quadriceps';
update exercise_library set position='Milieu', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='+', stability_demand='++', accessibility='+++', setup_notes='Haltère tenu verticalement contre le sternum ("goblet"), coudes passant entre les genoux en bas de mouvement.' where name ilike 'Squat gobelet%' and muscle_group='Quadriceps';
update exercise_library set position='Milieu', freedom_of_movement='++', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='++', accessibility='+++', setup_notes='Barre réglée à hauteur d''épaules dans la Smith machine avant de se placer dessous.' where name ilike 'Squat Smith%' and muscle_group='Quadriceps';
update exercise_library set position='Milieu', freedom_of_movement='+++', is_unilateral=true, microloadable=true, easy_to_replicate='++', learning_difficulty='++', stability_demand='+++', accessibility='+++', setup_notes='Step/box à hauteur de genou pour débuter, charge tenue en haltères le long du corps.' where name ilike 'Step-up%' and muscle_group='Quadriceps';

-- Ischio-jambiers
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='+++', stability_demand='+++', accessibility='+++', setup_notes='Barre au sol ou en départ mi-cuisse selon variante roumaine ; dos neutre maintenu tout du long, genoux légèrement fléchis fixes.' where (name ilike 'Soulevé de terre roumain%' or name ilike 'Romanian deadlift%') and muscle_group='Ischio-jambiers';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='+', learning_difficulty='+++', stability_demand='+++', accessibility='+++', setup_notes='Barre au sol, prise juste à l''extérieur des jambes, dos neutre du premier au dernier centimètre.' where name ilike 'Soulevé de terre jambes tendues%' and muscle_group='Ischio-jambiers';
update exercise_library set position='Raccourcie', freedom_of_movement='+', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='+++', setup_notes='Régler la position du rouleau juste au-dessus du talon, dossier/appui cuisses ajusté pour ne pas décoller le bassin.' where (name ilike 'Leg curl assis%' or name ilike 'Leg curl couché%') and muscle_group='Ischio-jambiers';
update exercise_library set position='Raccourcie', freedom_of_movement='+', is_unilateral=true, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='++', accessibility='++', setup_notes='Machine debout : travaille une jambe à la fois, régler le rouleau juste au-dessus du talon.' where name ilike 'Leg curl debout%' and muscle_group='Ischio-jambiers';
update exercise_library set position='Milieu', freedom_of_movement='+++', is_unilateral=false, microloadable=false, easy_to_replicate='+', learning_difficulty='+++', stability_demand='+++', accessibility='+', setup_notes='Genoux calés dans le support, partenaire ou machine pour bloquer les chevilles ; démarrer avec assistance élastique si nécessaire.' where name ilike 'Glute-ham raise%' and muscle_group='Ischio-jambiers';
update exercise_library set position='Milieu', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='++', stability_demand='+++', accessibility='+++', setup_notes='Mouvement de hanche (hip hinge), pas un squat : le kettlebell "s''envole" grâce à l''extension explosive des hanches.' where name ilike 'Swing kettlebell%' and muscle_group='Ischio-jambiers';

-- Fessiers
update exercise_library set position='Raccourcie', freedom_of_movement='+', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='++', stability_demand='+', accessibility='+++', setup_notes='Prévoir un tapis de protection sur la barre/l''appui pour le confort des hanches ; banc réglé bas pour extension complète.' where (name ilike 'Hip thrust%') and muscle_group='Fessiers';
update exercise_library set position='Milieu', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='++', stability_demand='+++', accessibility='+++', setup_notes='Pieds plus larges que les épaules, pointes ouvertes ~30°, barre au dos comme un back squat classique.' where name ilike 'Squat sumo%' and muscle_group='Fessiers';
update exercise_library set position='Raccourcie', freedom_of_movement='+', is_unilateral=false, microloadable=false, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='+++', setup_notes='Épaules et pieds au sol, montée du bassin en contraction fessiers, pas de charge nécessaire pour débuter.' where name ilike 'Pont fessier%' and muscle_group='Fessiers';
update exercise_library set position='Milieu', freedom_of_movement='++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='+', stability_demand='++', accessibility='+++', setup_notes='Buste penché en appui sur la poulie basse, mouvement de hanche pur (hip hinge), pas un tirage de bras.' where name ilike 'Cable pull-through%' and muscle_group='Fessiers';
update exercise_library set position='Raccourcie', freedom_of_movement='++', is_unilateral=true, microloadable=true, easy_to_replicate='++', learning_difficulty='+', stability_demand='++', accessibility='++', setup_notes='Cheville en appui sur la machine/poulie basse, jambe tendue, mouvement d''extension de hanche isolé.' where name ilike 'Kickback%' and muscle_group='Fessiers';
update exercise_library set position='Milieu', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='+', stability_demand='+', accessibility='+++', setup_notes='Genoux fléchis, pieds au sol, écarter les genoux contre une résistance élastique placée juste au-dessus des genoux.' where name ilike 'Abduction hanche%' and muscle_group='Fessiers';

-- Dos
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='+', learning_difficulty='+++', stability_demand='+++', accessibility='+++', setup_notes='Barre au sol, tibias proches, prise juste à l''extérieur des jambes, dos neutre maintenu du premier au dernier centimètre.' where name = 'Soulevé de terre' and muscle_group='Dos';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='++', stability_demand='++', accessibility='+++', setup_notes='Pieds plus larges que les épaules, prise entre les jambes, buste plus vertical qu''un deadlift conventionnel.' where name = 'Soulevé de terre sumo' and muscle_group='Dos';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='++', stability_demand='++', accessibility='++', setup_notes='Poignées neutres de chaque côté, trajectoire plus verticale et plus intuitive qu''une barre droite — bon point d''entrée pour apprendre le mouvement.' where name = 'Soulevé de terre Trap Bar (hex bar)' and muscle_group='Dos';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='+', stability_demand='++', accessibility='+++', setup_notes='Prise pronation ou neutre à largeur d''épaules, dos gainé, tire jusqu''au bas des côtes sans balancer le buste.' where (name ilike 'Tirage horizontal%' or name ilike 'Machine tirage horizontal%' or name = 'Rowing buste penché machine' or name = 'Rowing T-bar' or name = 'Rowing Yates') and muscle_group='Dos';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=false, easy_to_replicate='++', learning_difficulty='++', stability_demand='+++', accessibility='+++', setup_notes='Barre fixe réglée à hauteur adaptée (plus basse = plus facile), corps gainé en ligne droite, tire la poitrine vers la barre.' where name = 'Rowing inversé (inverted row)' and muscle_group='Dos';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='+', learning_difficulty='+++', stability_demand='+++', accessibility='+++', setup_notes='Chaque répétition part d''un arrêt complet au sol (pas de rebond), barre reposée entièrement entre les reps.' where name = 'Rowing Pendlay' and muscle_group='Dos';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=false, easy_to_replicate='+', learning_difficulty='+++', stability_demand='+++', accessibility='+++', setup_notes='Prise en pronation légèrement plus large que les épaules, gainage actif pour limiter le balancement.' where (name ilike 'Traction%pronation%' or name ilike 'Traction supination%' or name ilike 'Tractions supination%' or name ilike 'Tractions pronation%') and muscle_group='Dos';
update exercise_library set position='Étirée', freedom_of_movement='+', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='+++', setup_notes='Régler la hauteur des cale-cuisses, prise large pour cibler le dorsal en largeur.' where (name ilike 'Tirage vertical%' or name ilike 'Tirage poitrine%') and muscle_group='Dos' and name not ilike 'Tirage vertical unilatéral%';
update exercise_library set position='Étirée', freedom_of_movement='+', is_unilateral=true, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='++', accessibility='++', setup_notes='Poignée simple à la poulie haute, une main à la fois, gainage pour limiter la rotation du buste.' where name = 'Tirage vertical unilatéral' and muscle_group='Dos';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='++', stability_demand='+++', accessibility='+++', setup_notes='Dos neutre, amplitude limitée par la mobilité de hanche plutôt que par le bas du dos qui s''arrondit.' where name ilike 'Good morning%' and muscle_group='Dos';
update exercise_library set position='Étirée', freedom_of_movement='++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='+', stability_demand='++', accessibility='++', setup_notes='Bras tendus au-dessus de la tête en position de départ, mouvement d''épaule pur, coudes légèrement fléchis fixes.' where name ilike 'Pull-over%' and muscle_group='Dos';

-- Pectoraux
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='+', learning_difficulty='++', stability_demand='+++', accessibility='+++', setup_notes='Rack réglé à hauteur permettant de décrocher la barre sans se hisser ; barres de sécurité en place.' where (name ilike 'Développé couché barre%' or name ilike 'Développé couché prise serrée%') and muscle_group='Pectoraux';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='+', learning_difficulty='++', stability_demand='+++', accessibility='+++', setup_notes='Haltères amenés en position à l''aide des genoux en début de série, coudes à ~45° du buste.' where name ilike 'Développé couché haltères%' and muscle_group='Pectoraux';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='+', stability_demand='++', accessibility='+++', setup_notes='Banc incliné 30-45°, la barre guidée verticalement simplifie la trajectoire par rapport à la barre libre.' where name ilike 'Développé couché Smith%' and muscle_group='Pectoraux';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='+', learning_difficulty='++', stability_demand='+++', accessibility='+++', setup_notes='Banc incliné 30-45°, cible le chef claviculaire (haut des pectoraux).' where (name ilike 'Développé incliné%') and muscle_group='Pectoraux';
update exercise_library set position='Raccourcie', freedom_of_movement='+', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='++', setup_notes='Régler le siège pour que les poignées soient alignées avec le milieu des pectoraux.' where (name ilike 'Développé%machine%' or name ilike 'Développé à la machine%') and muscle_group='Pectoraux';
update exercise_library set position='Milieu', freedom_of_movement='+++', is_unilateral=false, microloadable=false, easy_to_replicate='++', learning_difficulty='++', stability_demand='+++', accessibility='+++', setup_notes='Mains légèrement plus larges que les épaules, corps gainé en ligne droite, coudes à ~45° du buste.' where name = 'Pompes' and muscle_group='Pectoraux';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='+', learning_difficulty='++', stability_demand='++', accessibility='+++', setup_notes='Coudes légèrement fléchis fixes tout du long, mouvement d''épaule (adduction horizontale), pas un mouvement de bras.' where (name ilike 'Écarté%haltères%') and muscle_group='Pectoraux';
update exercise_library set position='Raccourcie', freedom_of_movement='++', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='++', setup_notes='Régler le siège et la position des bras pour que les coudes soient alignés avec les poignées.' where (name ilike 'Pec deck%' or name ilike 'Écarté à la poulie%') and muscle_group='Pectoraux';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='++', stability_demand='+++', accessibility='+++', setup_notes='Buste penché en avant, coudes serrés le long du corps, descend jusqu''à un étirement confortable des épaules.' where name ilike 'Dips%pectoraux%' and muscle_group='Pectoraux';
update exercise_library set position='Étirée', freedom_of_movement='+', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='++', setup_notes='Régler le contre-poids/l''assistance et la hauteur du siège avant de commencer.' where name ilike 'Machine à dips%' and muscle_group='Pectoraux';

-- Épaules
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='+', learning_difficulty='+++', stability_demand='+++', accessibility='+++', setup_notes='Barre décrochée à hauteur d''épaules, poussée verticale stricte sans cambrer excessivement le bas du dos.' where name ilike 'Développé militaire barre%' and muscle_group='Épaules';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='++', stability_demand='+++', accessibility='+++', setup_notes='Assis ou debout, haltères de part et d''autre des épaules, coudes légèrement devant le buste.' where name ilike 'Développé militaire haltères%' and muscle_group='Épaules';
update exercise_library set position='Raccourcie', freedom_of_movement='+', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='++', setup_notes='Régler la hauteur du siège pour que les poignées démarrent au niveau des épaules.' where (name ilike 'Développé épaules%') and muscle_group='Épaules';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='+', stability_demand='++', accessibility='+++', setup_notes='Coudes légèrement fléchis fixes, lever jusqu''à hauteur d''épaule sans utiliser l''élan du buste.' where name ilike 'Élévations latérales haltères%' and muscle_group='Épaules';
update exercise_library set position='Étirée', freedom_of_movement='++', is_unilateral=true, microloadable=true, easy_to_replicate='++', learning_difficulty='+', stability_demand='++', accessibility='+++', setup_notes='Poulie basse, bras qui traverse légèrement devant le corps pour maintenir la tension sur tout le mouvement.' where name ilike 'Élévations latérales poulie%' and muscle_group='Épaules';
update exercise_library set position='Raccourcie', freedom_of_movement='+', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='++', setup_notes='Régler la hauteur du siège pour que les bras partent légèrement en dessous de l''horizontale.' where name ilike 'Élévations latérales machine%' and muscle_group='Épaules';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='++', stability_demand='++', accessibility='+++', setup_notes='Buste légèrement penché en avant, coudes hauts, cible le deltoïde postérieur.' where name ilike 'Oiseau%' and muscle_group='Épaules';
update exercise_library set position='Raccourcie', freedom_of_movement='+', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='++', setup_notes='Face à la machine, poitrine contre le dossier, cible le deltoïde postérieur en tirage inversé.' where name ilike 'Reverse pec deck%' and muscle_group='Épaules';
update exercise_library set position='Étirée', freedom_of_movement='++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='++', stability_demand='++', accessibility='+++', setup_notes='Corde à la poulie haute, tirer vers le visage en écartant les mains, coudes hauts en fin de mouvement.' where name ilike 'Face pull%' and muscle_group='Épaules';

-- Biceps
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='+', stability_demand='++', accessibility='+++', setup_notes='Coudes fixes le long du corps, pas de balancement du buste pour tricher en fin de série.' where name in ('Curl barre droite', 'Curl barre EZ') and muscle_group='Biceps';
update exercise_library set position='Étirée', freedom_of_movement='++', is_unilateral=true, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='++', setup_notes='Bras calé sur le pupitre incliné, isole le biceps en supprimant toute triche, une charge par bras.' where name = 'Curl barre EZ pupitre unilatéral' and muscle_group='Biceps';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=true, microloadable=true, easy_to_replicate='++', learning_difficulty='+', stability_demand='++', accessibility='+++', setup_notes='Coudes fixes le long du corps, supination progressive du poignet en montant si variante classique.' where (name ilike 'Curl haltères%') and muscle_group='Biceps';
update exercise_library set position='Milieu', freedom_of_movement='+++', is_unilateral=true, microloadable=true, easy_to_replicate='++', learning_difficulty='+', stability_demand='++', accessibility='+++', setup_notes='Prise neutre (paumes face à face) tout du long, cible aussi le brachial et le brachio-radial.' where name ilike 'Curl marteau%' and muscle_group='Biceps';
update exercise_library set position='Étirée', freedom_of_movement='++', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='++', setup_notes='Dos et bras plaqués contre le pupitre incliné, isole le biceps en supprimant toute triche.' where name ilike 'Curl pupitre%' and muscle_group='Biceps';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='+', stability_demand='++', accessibility='+++', setup_notes='Banc incliné 45-60°, bras pendant vers l''arrière, accentue l''étirement du biceps en position basse.' where name ilike 'Curl incliné%' and muscle_group='Biceps';
update exercise_library set position='Raccourcie', freedom_of_movement='+', is_unilateral=true, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='++', setup_notes='Régler le siège pour que l''épaule soit alignée avec l''axe de rotation de la machine.' where name ilike 'Curl machine%' and muscle_group='Biceps';
update exercise_library set position='Étirée', freedom_of_movement='++', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='+++', setup_notes='Poulie basse, tension constante sur tout le mouvement contrairement à la barre libre.' where name ilike 'Curl poulie basse%' and muscle_group='Biceps';

-- Triceps
update exercise_library set position='Étirée', freedom_of_movement='++', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='+++', setup_notes='Coudes serrés le long du corps, seul l''avant-bras bouge.' where name ilike 'Extension triceps poulie%' and muscle_group='Triceps';
update exercise_library set position='Étirée', freedom_of_movement='++', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='+++', setup_notes='Barre droite ou corde selon la prise recherchée, coudes fixes le long du corps tout du long.' where name ilike 'Extension poulie haute%' and muscle_group='Triceps';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='+', learning_difficulty='++', stability_demand='++', accessibility='+++', setup_notes='Coudes fixes pointant vers le plafond, descend la barre derrière la tête sans les écarter.' where (name ilike 'Extension nuque%' or name ilike 'Barre au front%') and muscle_group='Triceps';
update exercise_library set position='Raccourcie', freedom_of_movement='+', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='++', setup_notes='Régler le siège pour que les coudes soient alignés avec l''axe de rotation de la machine.' where name ilike 'Extension triceps machine%' and muscle_group='Triceps';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='+', stability_demand='++', accessibility='+++', setup_notes='Mains sur un banc derrière le buste, pieds au sol ou surélevés pour ajuster la difficulté — bonne porte d''entrée avant les dips aux barres parallèles.' where name = 'Dips triceps (banc)' and muscle_group='Triceps';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=false, easy_to_replicate='++', learning_difficulty='++', stability_demand='+++', accessibility='+++', setup_notes='Buste vertical (pas penché en avant comme les dips pectoraux), coudes serrés le long du corps.' where name = 'Dips triceps (barres parallèles)' and muscle_group='Triceps';
update exercise_library set position='Milieu', freedom_of_movement='+++', is_unilateral=false, microloadable=false, easy_to_replicate='++', learning_difficulty='++', stability_demand='+++', accessibility='+++', setup_notes='Mains rapprochées formant un losange sous le sternum, coudes vers l''arrière plutôt qu''écartés.' where name ilike 'Pompes diamant%' and muscle_group='Triceps';

-- Abdominaux
update exercise_library set position='Raccourcie', freedom_of_movement='+++', is_unilateral=false, microloadable=false, easy_to_replicate='++', learning_difficulty='+', stability_demand='++', accessibility='+++', setup_notes='Bas du dos plaqué au sol, mouvement d''enroulement du buste plutôt qu''un redressement complet.' where (name ilike 'Crunch au sol%' or name ilike 'Sit-up%') and muscle_group='Abdominaux';
update exercise_library set position='Raccourcie', freedom_of_movement='+', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='++', setup_notes='Régler le siège pour que le point de pivot soit aligné avec le bas des côtes.' where name ilike 'Crunch machine%' and muscle_group='Abdominaux';
update exercise_library set position='Raccourcie', freedom_of_movement='++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='+', stability_demand='++', accessibility='+++', setup_notes='Agenouillé face à la poulie haute, enroule le buste vers le bassin, les hanches restent fixes.' where name ilike 'Crunch poulie%' and muscle_group='Abdominaux';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=false, easy_to_replicate='+', learning_difficulty='++', stability_demand='+++', accessibility='+++', setup_notes='Suspendu à la barre de traction, relève les genoux ou jambes tendues sans se balancer.' where name ilike 'Relevé de jambes suspendu%' and muscle_group='Abdominaux';
update exercise_library set position='Étirée', freedom_of_movement='+++', is_unilateral=false, microloadable=false, easy_to_replicate='++', learning_difficulty='+', stability_demand='++', accessibility='+++', setup_notes='Bas du dos plaqué au sol, jambes tendues ou fléchies selon le niveau, ne pas creuser le dos en descendant.' where name ilike 'Relevé de jambes au sol%' and muscle_group='Abdominaux';
update exercise_library set position='Milieu', freedom_of_movement='+++', is_unilateral=false, microloadable=false, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+++', accessibility='+++', setup_notes='Corps aligné des épaules aux chevilles, avant-bras au sol, bassin ni trop haut ni affaissé.' where name ilike 'Planche (plank)%' and muscle_group='Abdominaux';
update exercise_library set position='Milieu', freedom_of_movement='+++', is_unilateral=false, microloadable=false, easy_to_replicate='++', learning_difficulty='++', stability_demand='+++', accessibility='+++', setup_notes='Corps aligné sur le côté, appui sur un avant-bras, hanches ne touchent pas le sol.' where name ilike 'Planche latérale%' and muscle_group='Abdominaux';
update exercise_library set position='Milieu', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='++', stability_demand='+++', accessibility='+++', setup_notes='Assis en équilibre sur le bassin, rotation du buste d''un côté à l''autre avec ou sans charge.' where name ilike 'Russian twist%' and muscle_group='Abdominaux';

-- Mollets
update exercise_library set position='Raccourcie', freedom_of_movement='+', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='+++', setup_notes='Régler la plateforme pour un étirement complet en bas sans que les talons ne touchent le sol.' where (name ilike 'Mollets assis%' or name ilike 'Mollets à la presse%') and muscle_group='Mollets';
update exercise_library set position='Raccourcie', freedom_of_movement='+', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='++', accessibility='++', setup_notes='Amplitude complète : descend jusqu''à un étirement franc du mollet avant de remonter sur la pointe des pieds.' where (name ilike 'Mollets debout%' or name ilike 'Mollets Smith%' or name ilike 'Mollets donkey%') and muscle_group='Mollets';

-- Avant-bras / Trapèzes
update exercise_library set position='Raccourcie', freedom_of_movement='+++', is_unilateral=false, microloadable=true, easy_to_replicate='+++', learning_difficulty='+', stability_demand='+', accessibility='+++', setup_notes='Monte les épaules verticalement vers les oreilles, pas de rotation, pause 1 seconde en haut.' where name ilike 'Shrugs%' and muscle_group='Trapèzes';
update exercise_library set position='Milieu', freedom_of_movement='+++', is_unilateral=false, microloadable=false, easy_to_replicate='+', learning_difficulty='+', stability_demand='+++', accessibility='+++', setup_notes='Marche en tenant une charge lourde dans chaque main, épaules basses, gainage actif.' where name ilike 'Farmer%' and muscle_group='Avant-bras';

-- Full Body / Cardio (mouvements structurants les plus courants)
update exercise_library set position='Milieu', freedom_of_movement='+++', is_unilateral=false, microloadable=false, easy_to_replicate='+', learning_difficulty='+++', stability_demand='+++', accessibility='+++', setup_notes='Enchaîne pompe, saut groupé et saut vertical ; régresser en enlevant la pompe ou le saut selon le niveau.' where name ilike 'Burpees%' and muscle_group='Full Body / Cardio';
update exercise_library set position='Milieu', freedom_of_movement='++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='+', stability_demand='++', accessibility='++', setup_notes='Régler la résistance/le niveau avant de démarrer, technique similaire au rameur classique.' where name ilike 'Rameur%' and muscle_group='Full Body / Cardio';
update exercise_library set position='Milieu', freedom_of_movement='++', is_unilateral=false, microloadable=true, easy_to_replicate='++', learning_difficulty='+', stability_demand='++', accessibility='+', setup_notes='Bras et jambes sollicités ensemble, régler la résistance avant de démarrer un intervalle.' where name ilike 'Assault bike%' and muscle_group='Full Body / Cardio';

-- ── 4. Nettoie les entrées "brand" restées sans instructions/catégorie ────
-- (mêmes mouvements que ceux déjà classifiés ci-dessus mais dont la ligne
-- individuelle n'avait pas d'instructions faute de template au moment du seed)
update exercise_library el set
  instructions = base.instructions
from (
  select distinct on (regexp_replace(name, '\s*—\s*[^—]+$', ''), muscle_group)
    regexp_replace(name, '\s*—\s*[^—]+$', '') as base_name, muscle_group, instructions
  from exercise_library
  where instructions is not null and name like '%—%'
) base
where el.instructions is null
  and regexp_replace(el.name, '\s*—\s*[^—]+$', '') = base.base_name
  and el.muscle_group = base.muscle_group;
