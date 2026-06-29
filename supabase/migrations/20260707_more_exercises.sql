-- Bibliothèque d'exercices — deuxième vague (~95 exercices supplémentaires).
-- INSERT idempotent : ignore les lignes dont le nom existe déjà.

INSERT INTO public.exercise_library (name, muscle_group, muscle_subgroup, equipment, category, difficulty, instructions, is_official)
SELECT * FROM (VALUES

-- PECTORAUX (suite)
('Floor press', 'Pectoraux', 'Chef sternal', 'Barre', 'compose', 'intermediaire', 'Allongé au sol, amplitude réduite, bon pour le verrouillage en fin de mouvement.', true),
('Svend press', 'Pectoraux', 'Chef sternal', 'Autre', 'isolation', 'intermediaire', 'Presse deux disques l''un contre l''autre devant la poitrine en poussant vers l''avant.', true),
('Développé incliné machine', 'Pectoraux', 'Chef claviculaire', 'Machine', 'compose', 'debutant', 'Trajectoire guidée vers le haut des pectoraux.', true),
('Développé décliné machine', 'Pectoraux', 'Chef sternal', 'Machine', 'compose', 'debutant', 'Trajectoire guidée vers le bas des pectoraux.', true),
('Écarté poulie debout unilatéral', 'Pectoraux', 'Chef sternal', 'Poulie', 'isolation', 'intermediaire', 'Un bras à la fois, ramène la poignée devant le sternum.', true),

-- DOS (suite)
('Rowing inversé (inverted row)', 'Dos', 'Rhomboïdes', 'Poids du corps', 'compose', 'debutant', 'Sous une barre fixe, tire le buste vers la barre en gardant le corps droit.', true),
('Renegade row', 'Dos', 'Grand dorsal', 'Haltères', 'compose', 'avance', 'En position de planche sur haltères, tire un bras à la fois vers la hanche.', true),
('Rowing Pendlay', 'Dos', 'Grand dorsal', 'Barre', 'compose', 'avance', 'Barre reposée au sol entre chaque répétition, buste parallèle au sol.', true),
('Seal row', 'Dos', 'Rhomboïdes', 'Barre', 'compose', 'avance', 'Allongé à plat ventre sur un banc surélevé, tire la barre sans tricher avec le bas du dos.', true),
('Tirage vertical unilatéral', 'Dos', 'Grand dorsal', 'Poulie', 'compose', 'intermediaire', 'Un bras à la fois, tire la poignée vers le bas en gardant le buste stable.', true),
('Tirage bras tendus (straight-arm pulldown)', 'Dos', 'Grand dorsal', 'Poulie', 'isolation', 'intermediaire', 'Bras tendus, pousse la barre vers les cuisses en gardant les épaules basses.', true),

-- ÉPAULES (suite)
('Élévations frontales disque', 'Épaules', 'Faisceau antérieur', 'Autre', 'isolation', 'debutant', 'Lève un disque tenu à deux mains jusqu''à hauteur des yeux.', true),
('Bus driver', 'Épaules', 'Faisceau antérieur', 'Autre', 'isolation', 'intermediaire', 'Bras tendus devant toi avec un disque, fais pivoter comme un volant de bus.', true),
('Lu raises', 'Épaules', 'Faisceau latéral', 'Haltères', 'isolation', 'avance', 'Combine une élévation frontale et latérale en un seul mouvement fluide.', true),
('Shrug press derrière le dos', 'Épaules', 'Faisceau postérieur', 'Barre', 'compose', 'avance', 'Variante technique combinant hausse d''épaules et poussée, à pratiquer avec prudence.', true),
('Élévations latérales banc incliné (poitrine)', 'Épaules', 'Faisceau latéral', 'Haltères', 'isolation', 'intermediaire', 'Allongé sur le flanc sur un banc incliné, élévation latérale stricte.', true),

-- BICEPS (suite)
('Zottman curl', 'Biceps', 'Chef long', 'Haltères', 'isolation', 'intermediaire', 'Monte en supination, descends en pronation : travaille biceps et avant-bras.', true),
('Drag curl', 'Biceps', 'Chef court', 'Barre', 'isolation', 'intermediaire', 'La barre glisse le long du buste, coudes reculent au lieu d''avancer.', true),
('Curl marteau croisé (cross-body)', 'Biceps', 'Brachial', 'Haltères', 'isolation', 'debutant', 'Amène l''haltère en diagonale vers l''épaule opposée.', true),

-- TRICEPS (suite)
('Tate press', 'Triceps', 'Chef médial', 'Haltères', 'isolation', 'avance', 'Coudes écartés, descends les haltères vers la poitrine façon écarté puis pousse.', true),
('Pompes serrées sur banc', 'Triceps', 'Chef latéral', 'Poids du corps', 'compose', 'intermediaire', 'Mains sur un banc, coudes proches du corps pour cibler les triceps.', true),
('Extension corde poulie basse unilatérale', 'Triceps', 'Chef latéral', 'Poulie', 'isolation', 'intermediaire', 'Poulie basse, étends le bras vers le bas en gardant le coude fixe.', true),

-- AVANT-BRAS (suite)
('Curl poignet derrière le dos', 'Avant-bras', 'Fléchisseurs', 'Barre', 'isolation', 'intermediaire', 'Barre tenue derrière le dos, enroule le poignet vers le haut.', true),
('Plate pinch carry', 'Avant-bras', 'Fléchisseurs', 'Autre', 'isolation', 'intermediaire', 'Pince deux disques lisses entre les doigts et marche sur une distance donnée.', true),

-- QUADRICEPS (suite)
('Belt squat', 'Quadriceps', 'Vaste latéral', 'Machine', 'compose', 'intermediaire', 'Charge suspendue à une ceinture, soulage la colonne tout en chargeant les jambes.', true),
('Squat Zercher', 'Quadriceps', 'Rectus femoris', 'Barre', 'compose', 'avance', 'Barre tenue au pli des coudes, exige beaucoup de gainage.', true),
('Fente marchée barre', 'Quadriceps', null, 'Barre', 'compose', 'avance', 'Barre sur le dos, avance pas après pas en fente.', true),
('Spanish squat', 'Quadriceps', 'Rectus femoris', 'Élastique', 'isolation', 'intermediaire', 'Élastique fixé derrière les genoux, descends en gardant le buste vertical.', true),

-- ISCHIO-JAMBIERS (suite)
('Leg curl sur swiss ball', 'Ischio-jambiers', 'Biceps fémoral', 'Autre', 'isolation', 'intermediaire', 'Allongé au sol, talons sur le ballon, ramène le ballon vers les fessiers en pont.', true),
('Reverse hyperextension', 'Ischio-jambiers', null, 'Machine', 'isolation', 'intermediaire', 'Buste fixe, lève les jambes vers l''arrière en contractant ischios et fessiers.', true),

-- FESSIERS (suite)
('Hip thrust unilatéral', 'Fessiers', 'Grand fessier', 'Poids du corps', 'compose', 'intermediaire', 'Une jambe au sol, pousse les hanches vers le haut sur l''autre jambe.', true),
('Pont fessier élastique', 'Fessiers', 'Moyen fessier', 'Élastique', 'compose', 'debutant', 'Élastique au-dessus des genoux, écarte légèrement en poussant les hanches.', true),
('Fente courtisane (curtsy lunge)', 'Fessiers', 'Moyen fessier', 'Haltères', 'compose', 'intermediaire', 'Croise une jambe derrière l''autre en diagonale en descendant.', true),

-- ADDUCTEURS (suite)
('Marche latérale élastique (band walk)', 'Adducteurs', null, 'Élastique', 'isolation', 'debutant', 'Élastique aux chevilles ou genoux, fais des pas latéraux en gardant la tension.', true),

-- MOLLETS (suite)
('Mollets unilatéral à la poulie', 'Mollets', 'Gastrocnémien', 'Poulie', 'isolation', 'intermediaire', 'Un pied à la fois sur la plateforme, monte sur la pointe.', true),
('Double unders (corde à sauter)', 'Mollets', null, 'Autre', 'isolation', 'avance', 'Deux passages de corde par saut, travail de pied avancé.', true),

-- ABDOMINAUX (suite)
('Cable crunch à genoux unilatéral', 'Abdominaux', 'Obliques', 'Poulie', 'isolation', 'intermediaire', 'Enroule le buste en diagonale vers un genou.', true),
('Stir the pot', 'Abdominaux', 'Transverse', 'Autre', 'isolation', 'avance', 'Avant-bras sur un swiss ball en planche, dessine des cercles avec le ballon.', true),
('Pallof press', 'Abdominaux', 'Obliques', 'Poulie', 'isolation', 'intermediaire', 'Poulie sur le côté, pousse devant toi en résistant à la rotation.', true),
('Reverse crunch', 'Abdominaux', 'Droit abdominal', 'Poids du corps', 'isolation', 'debutant', 'Ramène les genoux vers la poitrine en décollant le bassin.', true),
('Flutter kicks', 'Abdominaux', 'Droit abdominal', 'Poids du corps', 'isolation', 'debutant', 'Allongé, jambes tendues, alterne de petits battements sans toucher le sol.', true),
('Bicycle crunch', 'Abdominaux', 'Obliques', 'Poids du corps', 'isolation', 'debutant', 'Pédale en amenant le coude opposé vers le genou qui monte.', true),

-- TRAPÈZES (suite)
('Shrug barre derrière le dos', 'Trapèzes', 'Trapèze supérieur', 'Barre', 'isolation', 'avance', 'Barre tenue derrière les jambes, hausse les épaules.', true),
('Snatch grip high pull', 'Trapèzes', 'Trapèze moyen', 'Barre', 'compose', 'avance', 'Prise très large, tire la barre explosivement jusqu''au menton.', true),

-- FULL BODY / CARDIO (suite)
('Devil press', 'Full Body / Cardio', null, 'Haltères', 'compose', 'avance', 'Burpee avec haltères suivi d''un snatch à deux bras.', true),
('Man maker', 'Full Body / Cardio', null, 'Haltères', 'compose', 'avance', 'Pompe + rowing sur haltères + squat + développé enchaînés.', true),
('Sandbag carry', 'Full Body / Cardio', null, 'Autre', 'compose', 'intermediaire', 'Porte un sac de sable sur une distance, sollicite tout le corps en stabilisation.', true),
('Stair climber', 'Full Body / Cardio', null, 'Machine', 'isolation', 'debutant', 'Montée d''escaliers en continu, bon travail cardio et fessiers.', true),
('Ski erg', 'Full Body / Cardio', null, 'Machine', 'compose', 'intermediaire', 'Tire les poignées vers le bas comme un mouvement de ski de fond.', true),
('Prowler push', 'Full Body / Cardio', null, 'Autre', 'compose', 'intermediaire', 'Pousse un traîneau chargé en gardant le dos plat et les jambes motrices.', true),
('Sprint', 'Full Body / Cardio', null, 'Autre', 'compose', 'intermediaire', 'Course à allure maximale sur courte distance, récupération entre les répétitions.', true)

) AS t(name, muscle_group, muscle_subgroup, equipment, category, difficulty, instructions, is_official)
WHERE NOT EXISTS (SELECT 1 FROM public.exercise_library e WHERE e.name = t.name);
