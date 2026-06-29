-- EP Coaching — Bibliothèque d'exercices (catalogue global, distinct de la
-- table `exercises` qui sert aux lignes de programme par séance).
-- Tout le monde (coach + membres gratuits/payants) peut enrichir cette
-- bibliothèque ; seul le coach peut modifier/supprimer une entrée existante
-- (notamment pour y attacher les vidéos d'exécution plus tard).

CREATE TABLE IF NOT EXISTS public.exercise_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  muscle_group text NOT NULL,
  muscle_subgroup text,
  equipment text,
  category text CHECK (category IN ('compose', 'isolation')),
  difficulty text CHECK (difficulty IN ('debutant', 'intermediaire', 'avance')),
  instructions text,
  video_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_official boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_library_muscle_group ON public.exercise_library (muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercise_library_name ON public.exercise_library (name);

ALTER TABLE IF EXISTS public.exercise_library DISABLE ROW LEVEL SECURITY;

-- ── Seed: ~200 exercices officiels ──────────────────────────────────────────

INSERT INTO public.exercise_library (name, muscle_group, muscle_subgroup, equipment, category, difficulty, instructions, is_official) VALUES

-- PECTORAUX
('Développé couché barre', 'Pectoraux', 'Chef sternal', 'Barre', 'compose', 'intermediaire', 'Omoplates serrées, descends la barre au niveau du sternum, coudes à ~45° du buste.', true),
('Développé couché haltères', 'Pectoraux', 'Chef sternal', 'Haltères', 'compose', 'intermediaire', 'Amplitude plus grande qu''à la barre, contrôle la descente.', true),
('Développé incliné barre', 'Pectoraux', 'Chef claviculaire', 'Barre', 'compose', 'intermediaire', 'Banc à 30-45°, vise le haut des pectoraux.', true),
('Développé incliné haltères', 'Pectoraux', 'Chef claviculaire', 'Haltères', 'compose', 'intermediaire', 'Banc à 30-45°, descends jusqu''à sentir l''étirement.', true),
('Développé décliné barre', 'Pectoraux', 'Chef sternal', 'Barre', 'compose', 'intermediaire', 'Banc décliné, vise le bas des pectoraux.', true),
('Développé décliné haltères', 'Pectoraux', 'Chef sternal', 'Haltères', 'compose', 'intermediaire', 'Banc décliné, contrôle la phase descendante.', true),
('Développé couché prise serrée', 'Pectoraux', null, 'Barre', 'compose', 'intermediaire', 'Mains à largeur d''épaules, sollicite aussi les triceps.', true),
('Écarté couché haltères', 'Pectoraux', 'Chef sternal', 'Haltères', 'isolation', 'intermediaire', 'Coudes légèrement fléchis, ouvre en arc de cercle sans casser les poignets.', true),
('Écarté incliné haltères', 'Pectoraux', 'Chef claviculaire', 'Haltères', 'isolation', 'intermediaire', 'Même mouvement que l''écarté couché, banc incliné.', true),
('Écarté à la poulie vis-à-vis', 'Pectoraux', 'Chef sternal', 'Poulie', 'isolation', 'intermediaire', 'Cross-over, ramène les poignées devant le sternum en arc de cercle.', true),
('Pec deck / Butterfly', 'Pectoraux', 'Chef sternal', 'Machine', 'isolation', 'debutant', 'Coudes au niveau des épaules, rapproche les bras sans à-coup.', true),
('Dips pectoraux', 'Pectoraux', 'Chef sternal', 'Poids du corps', 'compose', 'avance', 'Buste penché en avant, coudes écartés pour cibler les pectoraux.', true),
('Pompes', 'Pectoraux', null, 'Poids du corps', 'compose', 'debutant', 'Corps gainé, descends jusqu''à effleurer le sol.', true),
('Pompes lestées', 'Pectoraux', null, 'Poids du corps', 'compose', 'avance', 'Même mouvement que les pompes classiques avec une charge sur le dos.', true),
('Développé à la machine (chest press)', 'Pectoraux', 'Chef sternal', 'Machine', 'compose', 'debutant', 'Dos plaqué au dossier, pousse sans verrouiller complètement les coudes.', true),
('Crossover poulie haute', 'Pectoraux', 'Chef sternal', 'Poulie', 'isolation', 'intermediaire', 'Poulies en hauteur, ramène les mains vers le bas en croisant légèrement.', true),
('Pull-over haltère', 'Pectoraux', null, 'Haltères', 'isolation', 'intermediaire', 'Allongé en travers d''un banc, fais passer l''haltère derrière la tête en gardant les bras tendus.', true),
('Développé couché Smith machine', 'Pectoraux', 'Chef sternal', 'Smith machine', 'compose', 'debutant', 'Trajectoire guidée, utile pour se concentrer sur la poussée.', true),

-- DOS
('Tractions pronation', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Prise large, tire la barre jusqu''au menton en gainant le buste.', true),
('Tractions supination', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Prise serrée mains vers toi, sollicite aussi les biceps.', true),
('Tractions lestées', 'Dos', 'Grand dorsal', 'Poids du corps', 'compose', 'avance', 'Ajoute une charge à la ceinture une fois les tractions au poids du corps maîtrisées.', true),
('Tirage horizontal barre', 'Dos', 'Rhomboïdes', 'Barre', 'compose', 'intermediaire', 'Buste penché à 45°, tire la barre vers le nombril.', true),
('Tirage horizontal haltère (rowing unilatéral)', 'Dos', 'Grand dorsal', 'Haltères', 'compose', 'intermediaire', 'Un genou sur le banc, tire l''haltère vers la hanche.', true),
('Tirage horizontal poulie basse', 'Dos', 'Rhomboïdes', 'Poulie', 'compose', 'debutant', 'Dos droit, tire la poignée vers l''abdomen en rapprochant les omoplates.', true),
('Tirage vertical poulie haute (lat pulldown)', 'Dos', 'Grand dorsal', 'Poulie', 'compose', 'debutant', 'Tire la barre vers le haut de la poitrine sans te pencher en arrière excessivement.', true),
('Rowing T-bar', 'Dos', 'Grand dorsal', 'Barre', 'compose', 'intermediaire', 'Buste penché, tire la charge vers le sternum.', true),
('Rowing Yates', 'Dos', 'Grand dorsal', 'Barre', 'compose', 'avance', 'Buste plus droit qu''un rowing classique, prise supination.', true),
('Soulevé de terre', 'Dos', 'Érecteurs (lombaire)', 'Barre', 'compose', 'avance', 'Dos neutre, pousse le sol avec les jambes en gardant la barre proche du corps.', true),
('Soulevé de terre roumain', 'Dos', 'Érecteurs (lombaire)', 'Barre', 'compose', 'intermediaire', 'Jambes presque tendues, recule les hanches en gardant le dos plat.', true),
('Soulevé de terre sumo', 'Dos', null, 'Barre', 'compose', 'avance', 'Pieds larges, prise serrée, buste plus vertical qu''un deadlift classique.', true),
('Pull-over poulie haute', 'Dos', 'Grand dorsal', 'Poulie', 'isolation', 'intermediaire', 'Bras quasi tendus, tire la barre vers les cuisses.', true),
('Rowing buste penché machine', 'Dos', 'Rhomboïdes', 'Machine', 'compose', 'debutant', 'Poitrine calée contre l''appui, tire les poignées vers toi.', true),
('Tirage horizontal prise large', 'Dos', 'Trapèze moyen', 'Poulie', 'compose', 'intermediaire', 'Coudes écartés, vise l''épaisseur du haut du dos.', true),
('Tirage vertical prise serrée (V-bar)', 'Dos', 'Grand dorsal', 'Poulie', 'compose', 'debutant', 'Prise neutre serrée, accentue le travail du bas du grand dorsal.', true),
('Good morning', 'Dos', 'Érecteurs (lombaire)', 'Barre', 'compose', 'avance', 'Barre sur le haut du dos, bascule le buste vers l''avant en gardant les jambes presque tendues.', true),
('Hyperextensions', 'Dos', 'Érecteurs (lombaire)', 'Machine', 'isolation', 'debutant', 'Bascule depuis les hanches, évite l''hyperextension lombaire en haut du mouvement.', true),
('Rack pulls', 'Dos', 'Érecteurs (thoracique)', 'Barre', 'compose', 'intermediaire', 'Deadlift partiel démarré depuis des supports à hauteur de genou.', true),
('Machine tirage horizontal assis', 'Dos', 'Rhomboïdes', 'Machine', 'compose', 'debutant', 'Pieds calés, tire les poignées vers le buste en gardant le dos droit.', true),
('Superman (renfo lombaire)', 'Dos', 'Érecteurs (lombaire)', 'Poids du corps', 'isolation', 'debutant', 'Allongé au sol, lève simultanément bras et jambes.', true),

-- ÉPAULES
('Développé militaire barre', 'Épaules', 'Faisceau antérieur', 'Barre', 'compose', 'intermediaire', 'Debout ou assis, pousse la barre au-dessus de la tête sans cambrer excessivement.', true),
('Développé militaire haltères', 'Épaules', 'Faisceau antérieur', 'Haltères', 'compose', 'intermediaire', 'Assis ou debout, pousse les haltères à la verticale des épaules.', true),
('Développé Arnold', 'Épaules', 'Faisceau antérieur', 'Haltères', 'compose', 'intermediaire', 'Rotation des poignets pendant la poussée, paumes face à toi en bas.', true),
('Élévations latérales haltères', 'Épaules', 'Faisceau latéral', 'Haltères', 'isolation', 'debutant', 'Lève les bras jusqu''à l''horizontale, coudes légèrement fléchis.', true),
('Élévations latérales poulie', 'Épaules', 'Faisceau latéral', 'Poulie', 'isolation', 'intermediaire', 'Tension continue contrairement aux haltères, lève jusqu''à l''horizontale.', true),
('Élévations latérales machine', 'Épaules', 'Faisceau latéral', 'Machine', 'isolation', 'debutant', 'Coudes calés contre les appuis, lève sans élan.', true),
('Élévations frontales haltères', 'Épaules', 'Faisceau antérieur', 'Haltères', 'isolation', 'debutant', 'Lève un bras (ou les deux) jusqu''à hauteur d''épaule, sans élan du buste.', true),
('Élévations frontales barre', 'Épaules', 'Faisceau antérieur', 'Barre', 'isolation', 'intermediaire', 'Prise pronation, lève la barre jusqu''aux yeux.', true),
('Oiseau (élévations postérieures) haltères', 'Épaules', 'Faisceau postérieur', 'Haltères', 'isolation', 'intermediaire', 'Buste penché à 90°, écarte les bras en gardant les coudes légèrement fléchis.', true),
('Reverse pec deck', 'Épaules', 'Faisceau postérieur', 'Machine', 'isolation', 'debutant', 'Face à la machine, écarte les bras vers l''arrière.', true),
('Face pull', 'Épaules', 'Faisceau postérieur', 'Poulie', 'isolation', 'debutant', 'Tire la corde vers le visage en écartant les mains, coudes hauts.', true),
('Développé épaules Smith machine', 'Épaules', 'Faisceau antérieur', 'Smith machine', 'compose', 'debutant', 'Trajectoire guidée, pousse au-dessus de la tête.', true),
('Tirage menton (upright row)', 'Épaules', 'Faisceau latéral', 'Barre', 'compose', 'intermediaire', 'Tire la barre le long du corps jusqu''au menton, coudes hauts.', true),
('Développé épaules machine', 'Épaules', 'Faisceau antérieur', 'Machine', 'compose', 'debutant', 'Dos calé, pousse les poignées vers le haut.', true),
('Cuban press', 'Épaules', 'Faisceau postérieur', 'Haltères', 'isolation', 'avance', 'Rotation externe puis poussée, mouvement technique pour la santé d''épaule.', true),
('Landmine press', 'Épaules', 'Faisceau antérieur', 'Barre', 'compose', 'intermediaire', 'Barre calée au sol dans un coin, pousse en diagonale au-dessus de l''épaule.', true),
('Développé nuque', 'Épaules', 'Faisceau latéral', 'Barre', 'compose', 'avance', 'À pratiquer avec prudence : amplitude réduite, ne descends pas sous la nuque.', true),

-- BICEPS
('Curl barre EZ', 'Biceps', 'Chef court', 'Barre', 'isolation', 'debutant', 'Coudes fixes le long du corps, remonte la barre sans élan.', true),
('Curl barre droite', 'Biceps', 'Chef long', 'Barre', 'isolation', 'debutant', 'Prise à largeur d''épaules, contrôle la descente.', true),
('Curl haltères alterné', 'Biceps', null, 'Haltères', 'isolation', 'debutant', 'Alterne les bras, tourne le poignet en supination en montant.', true),
('Curl haltères simultané', 'Biceps', null, 'Haltères', 'isolation', 'debutant', 'Les deux bras montent ensemble, garde les coudes stables.', true),
('Curl incliné haltères', 'Biceps', 'Chef long', 'Haltères', 'isolation', 'intermediaire', 'Banc incliné à 45-60°, bras tombant dans le dos pour étirer le chef long.', true),
('Curl pupitre (Larry Scott)', 'Biceps', 'Chef court', 'Barre', 'isolation', 'intermediaire', 'Aisselles calées sur le pupitre, isole fortement le biceps.', true),
('Curl concentré', 'Biceps', 'Chef court', 'Haltères', 'isolation', 'intermediaire', 'Coude calé contre l''intérieur de la cuisse, contraction maximale en haut.', true),
('Curl marteau', 'Biceps', 'Brachial', 'Haltères', 'isolation', 'debutant', 'Prise neutre (paumes face à face), sollicite aussi le brachial et l''avant-bras.', true),
('Curl poulie basse', 'Biceps', null, 'Poulie', 'isolation', 'debutant', 'Tension continue sur tout le mouvement, contrairement à la barre/haltères.', true),
('Curl poulie haute (double biceps)', 'Biceps', 'Chef long', 'Poulie', 'isolation', 'intermediaire', 'Bras écartés sur le côté, ramène les poignées vers les tempes.', true),
('Curl spider', 'Biceps', 'Chef court', 'Barre', 'isolation', 'intermediaire', 'Buste appuyé sur un banc incliné face contre le dossier, isole le biceps sans triche.', true),
('Curl 21s', 'Biceps', null, 'Barre', 'isolation', 'avance', '7 reps partielles basses + 7 hautes + 7 complètes sans repos, méthode d''intensification.', true),
('Curl machine', 'Biceps', null, 'Machine', 'isolation', 'debutant', 'Coudes calés sur le support, remonte sans à-coup.', true),
('Curl inversé (reverse curl)', 'Biceps', null, 'Barre', 'isolation', 'intermediaire', 'Prise pronation, sollicite davantage le brachial et l''avant-bras.', true),

-- TRICEPS
('Extension poulie haute barre droite', 'Triceps', 'Chef latéral', 'Poulie', 'isolation', 'debutant', 'Coudes fixes le long du corps, pousse la barre vers le bas.', true),
('Extension poulie haute corde', 'Triceps', 'Chef latéral', 'Poulie', 'isolation', 'debutant', 'Écarte les mains en fin de mouvement pour une contraction complète.', true),
('Extension poulie prise inversée', 'Triceps', 'Chef médial', 'Poulie', 'isolation', 'intermediaire', 'Paumes vers le haut, variante qui change l''angle de travail.', true),
('Barre au front (skull crusher)', 'Triceps', 'Chef long', 'Barre', 'isolation', 'intermediaire', 'Allongé sur un banc, descends la barre vers le front en gardant les coudes fixes.', true),
('Extension nuque haltère (French press)', 'Triceps', 'Chef long', 'Haltères', 'isolation', 'intermediaire', 'Coudes pointés vers le plafond, descends l''haltère derrière la tête.', true),
('Extension nuque unilatérale', 'Triceps', 'Chef long', 'Haltères', 'isolation', 'intermediaire', 'Même mouvement qu''à deux bras, un bras à la fois pour corriger les déséquilibres.', true),
('Dips triceps (banc)', 'Triceps', 'Chef latéral', 'Poids du corps', 'compose', 'debutant', 'Mains sur un banc derrière toi, descends en gardant le buste vertical.', true),
('Dips triceps (barres parallèles)', 'Triceps', 'Chef latéral', 'Poids du corps', 'compose', 'intermediaire', 'Buste droit (plus vertical que pour les pectoraux) pour cibler les triceps.', true),
('Kick-back haltère', 'Triceps', 'Chef latéral', 'Haltères', 'isolation', 'debutant', 'Buste penché, bras à l''horizontale, étends l''avant-bras vers l''arrière.', true),
('Extension triceps machine', 'Triceps', null, 'Machine', 'isolation', 'debutant', 'Coudes calés, pousse vers le bas ou l''avant selon la machine.', true),
('Pompes diamant', 'Triceps', 'Chef médial', 'Poids du corps', 'compose', 'intermediaire', 'Mains rapprochées sous le sternum en losange.', true),
('JM Press', 'Triceps', 'Chef long', 'Barre', 'compose', 'avance', 'Hybride entre développé couché serré et barre au front.', true),
('Extension poulie basse unilatérale', 'Triceps', 'Chef latéral', 'Poulie', 'isolation', 'intermediaire', 'Un bras à la fois, coude fixe, pousse vers le bas.', true),

-- AVANT-BRAS
('Curl poignet barre', 'Avant-bras', 'Fléchisseurs', 'Barre', 'isolation', 'debutant', 'Avant-bras posés sur les cuisses ou un banc, enroule le poignet vers le haut.', true),
('Curl poignet inversé', 'Avant-bras', 'Extenseurs', 'Barre', 'isolation', 'debutant', 'Même position, prise pronation, travaille les extenseurs.', true),
('Farmer''s walk', 'Avant-bras', 'Fléchisseurs', 'Haltères', 'compose', 'debutant', 'Marche en tenant des charges lourdes de chaque main, garde le buste droit.', true),
('Dead hang (suspension)', 'Avant-bras', 'Fléchisseurs', 'Poids du corps', 'isolation', 'debutant', 'Suspendu à la barre, tiens la position le plus longtemps possible.', true),
('Wrist roller', 'Avant-bras', 'Fléchisseurs', 'Autre', 'isolation', 'intermediaire', 'Enroule la corde autour du bâton pour remonter la charge.', true),
('Extension poignet haltère', 'Avant-bras', 'Extenseurs', 'Haltères', 'isolation', 'debutant', 'Paume vers le bas, relève le poignet contre la résistance.', true),
('Pince à doigts (grip)', 'Avant-bras', 'Fléchisseurs', 'Autre', 'isolation', 'intermediaire', 'Travail de préhension avec une pince ou un grip trainer.', true),

-- QUADRICEPS
('Squat barre (back squat)', 'Quadriceps', 'Vaste latéral', 'Barre', 'compose', 'intermediaire', 'Barre sur le haut du dos, descends hanches en arrière et genoux dans l''axe des pieds.', true),
('Front squat', 'Quadriceps', 'Rectus femoris', 'Barre', 'compose', 'avance', 'Barre posée sur les épaules avant, buste plus vertical qu''un back squat.', true),
('Squat gobelet (goblet squat)', 'Quadriceps', null, 'Haltères', 'compose', 'debutant', 'Charge tenue contre la poitrine, bon premier pas vers le squat.', true),
('Presse à cuisses (leg press)', 'Quadriceps', 'Vaste latéral', 'Machine', 'compose', 'debutant', 'Pieds à largeur d''épaules, pousse sans verrouiller complètement les genoux.', true),
('Hack squat', 'Quadriceps', 'Vaste médial', 'Machine', 'compose', 'intermediaire', 'Dos calé contre le support, descends en contrôlant.', true),
('Leg extension', 'Quadriceps', 'Rectus femoris', 'Machine', 'isolation', 'debutant', 'Tibias calés sous le rouleau, étends les jambes sans à-coup.', true),
('Fentes avant', 'Quadriceps', null, 'Haltères', 'compose', 'intermediaire', 'Grand pas en avant, descends jusqu''à ce que le genou arrière frôle le sol.', true),
('Fentes bulgares', 'Quadriceps', null, 'Haltères', 'compose', 'avance', 'Pied arrière surélevé sur un banc, descends à la verticale.', true),
('Squat Smith machine', 'Quadriceps', 'Vaste latéral', 'Smith machine', 'compose', 'debutant', 'Trajectoire guidée, utile pour se concentrer sur la descente.', true),
('Squat sauté', 'Quadriceps', null, 'Poids du corps', 'compose', 'intermediaire', 'Explose vers le haut depuis la position basse du squat.', true),
('Step-up', 'Quadriceps', null, 'Haltères', 'compose', 'intermediaire', 'Monte sur un banc/step une jambe à la fois sans pousser sur la jambe arrière.', true),
('Sissy squat', 'Quadriceps', 'Rectus femoris', 'Poids du corps', 'isolation', 'avance', 'Talons fixes, recule les genoux en gardant le buste droit pour étirer le quadriceps.', true),
('Pistol squat', 'Quadriceps', null, 'Poids du corps', 'compose', 'avance', 'Squat sur une jambe, l''autre tendue devant toi.', true),
('Squat box', 'Quadriceps', null, 'Barre', 'compose', 'intermediaire', 'Descends jusqu''à toucher une box puis repousse, contrôle le rebond.', true),

-- ISCHIO-JAMBIERS
('Leg curl couché', 'Ischio-jambiers', 'Biceps fémoral', 'Machine', 'isolation', 'debutant', 'Allongé sur le ventre, ramène les talons vers les fessiers.', true),
('Leg curl assis', 'Ischio-jambiers', 'Semi-tendineux', 'Machine', 'isolation', 'debutant', 'Dos calé, fléchis les genoux contre la résistance.', true),
('Leg curl debout', 'Ischio-jambiers', 'Semi-membraneux', 'Machine', 'isolation', 'debutant', 'Un appui à la fois, fléchis le genou vers l''arrière.', true),
('Soulevé de terre jambes tendues', 'Ischio-jambiers', 'Biceps fémoral', 'Barre', 'compose', 'avance', 'Jambes quasiment droites, descends la barre en gardant le dos plat.', true),
('Nordic ham curl', 'Ischio-jambiers', 'Biceps fémoral', 'Poids du corps', 'isolation', 'avance', 'Genoux ancrés, descends le buste vers l''avant en résistant le plus possible.', true),
('Glute-ham raise (GHR)', 'Ischio-jambiers', null, 'Machine', 'compose', 'avance', 'Combine flexion de hanche et de genou, exercice avancé pour ischios et fessiers.', true),
('Swing kettlebell', 'Ischio-jambiers', null, 'Kettlebell', 'compose', 'intermediaire', 'Bascule des hanches pour projeter le kettlebell, pas un squat.', true),
('Soulevé de terre roumain unilatéral', 'Ischio-jambiers', 'Biceps fémoral', 'Haltères', 'compose', 'intermediaire', 'Sur une jambe, descends l''haltère en gardant le dos plat et la hanche carrée.', true),

-- FESSIERS
('Hip thrust barre', 'Fessiers', 'Grand fessier', 'Barre', 'compose', 'intermediaire', 'Haut du dos sur un banc, pousse les hanches vers le plafond en contractant les fessiers.', true),
('Hip thrust machine', 'Fessiers', 'Grand fessier', 'Machine', 'compose', 'debutant', 'Même mouvement que la barre, trajectoire guidée.', true),
('Pont fessier (glute bridge)', 'Fessiers', 'Grand fessier', 'Poids du corps', 'compose', 'debutant', 'Allongé au sol, pousse les hanches vers le haut.', true),
('Squat sumo', 'Fessiers', 'Moyen fessier', 'Barre', 'compose', 'intermediaire', 'Pieds très écartés, pointes vers l''extérieur, descends en gardant le buste droit.', true),
('Kickback poulie', 'Fessiers', 'Grand fessier', 'Poulie', 'isolation', 'debutant', 'Cheville à la poulie basse, tends la jambe vers l''arrière.', true),
('Kickback machine', 'Fessiers', 'Grand fessier', 'Machine', 'isolation', 'debutant', 'Pousse la plateforme vers l''arrière en contractant le fessier.', true),
('Abduction hanche machine', 'Fessiers', 'Moyen fessier', 'Machine', 'isolation', 'debutant', 'Écarte les jambes contre la résistance, dos bien calé.', true),
('Abduction hanche poulie', 'Fessiers', 'Moyen fessier', 'Poulie', 'isolation', 'debutant', 'Cheville à la poulie, écarte la jambe vers l''extérieur.', true),
('Fentes marchées', 'Fessiers', 'Grand fessier', 'Haltères', 'compose', 'intermediaire', 'Avance pas après pas en fente, pousse sur le talon avant.', true),
('Cable pull-through', 'Fessiers', 'Grand fessier', 'Poulie', 'compose', 'debutant', 'Dos au poteau, bascule les hanches en tirant la corde entre les jambes.', true),
('Frog pump', 'Fessiers', 'Grand fessier', 'Poids du corps', 'isolation', 'debutant', 'Plantes de pieds jointes genoux écartés, pousse les hanches vers le haut.', true),

-- ADDUCTEURS
('Machine adducteurs', 'Adducteurs', 'Long adducteur', 'Machine', 'isolation', 'debutant', 'Rapproche les jambes contre la résistance.', true),
('Adduction poulie', 'Adducteurs', 'Long adducteur', 'Poulie', 'isolation', 'debutant', 'Cheville à la poulie basse, ramène la jambe vers l''intérieur.', true),
('Fente latérale (side lunge)', 'Adducteurs', 'Grand adducteur', 'Haltères', 'compose', 'intermediaire', 'Grand pas latéral, descends sur la jambe pliée en gardant l''autre tendue.', true),
('Copenhagen plank', 'Adducteurs', 'Gracile', 'Poids du corps', 'isolation', 'avance', 'Planche latérale avec le pied surélevé sur un banc, exercice avancé pour les adducteurs.', true),
('Squeeze ballon (adduction isométrique)', 'Adducteurs', null, 'Autre', 'isolation', 'debutant', 'Serre un ballon ou coussin entre les genoux en contraction isométrique.', true),

-- MOLLETS
('Mollets debout machine', 'Mollets', 'Gastrocnémien', 'Machine', 'isolation', 'debutant', 'Monte sur la pointe des pieds le plus haut possible, descends en étirant.', true),
('Mollets assis machine', 'Mollets', 'Soléaire', 'Machine', 'isolation', 'debutant', 'Genoux fléchis, accentue le travail du soléaire.', true),
('Mollets à la presse', 'Mollets', 'Gastrocnémien', 'Machine', 'isolation', 'debutant', 'Pieds sur le bas de la plateforme de leg press, pousse avec les chevilles.', true),
('Mollets debout haltère unilatéral', 'Mollets', 'Gastrocnémien', 'Haltères', 'isolation', 'debutant', 'Un pied sur une cale, monte sur la pointe en te tenant à un appui.', true),
('Mollets donkey', 'Mollets', 'Gastrocnémien', 'Machine', 'isolation', 'intermediaire', 'Buste penché à l''horizontale, charge sur les hanches, monte sur la pointe des pieds.', true),
('Mollets Smith machine', 'Mollets', 'Gastrocnémien', 'Smith machine', 'isolation', 'debutant', 'Pieds sur une cale, barre sur les épaules, monte sur la pointe des pieds.', true),
('Sauts à la corde', 'Mollets', null, 'Autre', 'isolation', 'debutant', 'Petits sauts répétés, bon travail de pied et d''endurance des mollets.', true),
('Tibialis raise (dorsiflexion)', 'Mollets', null, 'Poids du corps', 'isolation', 'debutant', 'Dos au mur, relève la pointe des pieds vers le tibia.', true),

-- ABDOMINAUX
('Crunch au sol', 'Abdominaux', 'Droit abdominal', 'Poids du corps', 'isolation', 'debutant', 'Décolle les épaules du sol en contractant les abdos, sans tirer sur la nuque.', true),
('Crunch poulie haute', 'Abdominaux', 'Droit abdominal', 'Poulie', 'isolation', 'intermediaire', 'À genoux face à la poulie, enroule le buste vers le bas.', true),
('Relevé de jambes suspendu', 'Abdominaux', 'Droit abdominal', 'Poids du corps', 'isolation', 'avance', 'Suspendu à la barre, relève les jambes sans te balancer.', true),
('Relevé de jambes au sol', 'Abdominaux', 'Droit abdominal', 'Poids du corps', 'isolation', 'debutant', 'Allongé, relève les jambes tendues ou fléchies sans cambrer le bas du dos.', true),
('Planche (plank)', 'Abdominaux', 'Transverse', 'Poids du corps', 'isolation', 'debutant', 'Corps aligné des épaules aux chevilles, gaine le ventre.', true),
('Planche latérale', 'Abdominaux', 'Obliques', 'Poids du corps', 'isolation', 'intermediaire', 'Appui sur un avant-bras, corps aligné, hanche haute.', true),
('Ab wheel (roue abdo)', 'Abdominaux', 'Droit abdominal', 'Autre', 'isolation', 'avance', 'À genoux, roule la roue vers l''avant en gardant le dos gainé.', true),
('Russian twist', 'Abdominaux', 'Obliques', 'Autre', 'isolation', 'intermediaire', 'Assis en équilibre, fais pivoter le buste d''un côté à l''autre.', true),
('Crunch machine', 'Abdominaux', 'Droit abdominal', 'Machine', 'isolation', 'debutant', 'Enroule le buste vers le bas contre la résistance.', true),
('Mountain climbers', 'Abdominaux', null, 'Poids du corps', 'isolation', 'debutant', 'En position de planche, ramène les genoux vers la poitrine alternativement.', true),
('Hanging knee raise', 'Abdominaux', 'Droit abdominal', 'Poids du corps', 'isolation', 'intermediaire', 'Suspendu, ramène les genoux vers la poitrine.', true),
('Toes to bar', 'Abdominaux', 'Droit abdominal', 'Poids du corps', 'isolation', 'avance', 'Suspendu, amène les pieds jusqu''à la barre.', true),
('Dragon flag', 'Abdominaux', 'Droit abdominal', 'Poids du corps', 'isolation', 'avance', 'Allongé sur un banc, tiens les épaules au sol et lève le corps tendu.', true),
('Cable woodchopper', 'Abdominaux', 'Obliques', 'Poulie', 'isolation', 'intermediaire', 'Poulie haute, fais pivoter le buste en diagonale vers le bas.', true),
('Sit-up', 'Abdominaux', 'Droit abdominal', 'Poids du corps', 'isolation', 'debutant', 'Relève tout le buste jusqu''à être assis, amplitude plus grande que le crunch.', true),
('V-ups', 'Abdominaux', 'Droit abdominal', 'Poids du corps', 'isolation', 'avance', 'Lève simultanément buste et jambes tendues pour former un V.', true),
('Hollow body hold', 'Abdominaux', 'Transverse', 'Poids du corps', 'isolation', 'intermediaire', 'Allongé, bas du dos plaqué au sol, bras et jambes légèrement décollés.', true),

-- TRAPÈZES
('Shrugs barre', 'Trapèzes', 'Trapèze supérieur', 'Barre', 'isolation', 'debutant', 'Hausse les épaules vers les oreilles sans rouler.', true),
('Shrugs haltères', 'Trapèzes', 'Trapèze supérieur', 'Haltères', 'isolation', 'debutant', 'Même mouvement qu''à la barre, amplitude souvent plus grande.', true),
('Shrugs Smith machine', 'Trapèzes', 'Trapèze supérieur', 'Smith machine', 'isolation', 'debutant', 'Trajectoire guidée, utile pour charger lourd en sécurité.', true),
('Shrugs poulie basse', 'Trapèzes', 'Trapèze supérieur', 'Poulie', 'isolation', 'debutant', 'Tension continue sur tout le mouvement.', true),
('Rowing haute poulie (high pull)', 'Trapèzes', 'Trapèze moyen', 'Poulie', 'compose', 'intermediaire', 'Tire vers le haut en gardant les coudes au-dessus des mains.', true),

-- FULL BODY / CARDIO
('Clean and jerk', 'Full Body / Cardio', null, 'Barre', 'compose', 'avance', 'Mouvement olympique : épaulé puis jeté, technique à apprendre progressivement.', true),
('Snatch (arraché)', 'Full Body / Cardio', null, 'Barre', 'compose', 'avance', 'Mouvement olympique amenant la barre du sol directement au-dessus de la tête.', true),
('Burpees', 'Full Body / Cardio', null, 'Poids du corps', 'compose', 'intermediaire', 'Squat, pompe, saut : enchaînement cardio complet.', true),
('Kettlebell swing', 'Full Body / Cardio', null, 'Kettlebell', 'compose', 'intermediaire', 'Bascule des hanches pour projeter le kettlebell à hauteur d''épaule.', true),
('Thruster', 'Full Body / Cardio', null, 'Barre', 'compose', 'avance', 'Squat suivi d''un développé militaire enchaînés sans pause.', true),
('Wall ball', 'Full Body / Cardio', null, 'Autre', 'compose', 'intermediaire', 'Squat puis lancer du medecine ball contre un mur.', true),
('Rameur (rowing machine)', 'Full Body / Cardio', null, 'Machine', 'compose', 'debutant', 'Pousse avec les jambes puis tire avec les bras, dans cet ordre.', true),
('Vélo elliptique', 'Full Body / Cardio', null, 'Machine', 'isolation', 'debutant', 'Cardio à faible impact, bon pour la récupération active.', true),
('Tapis de course', 'Full Body / Cardio', null, 'Machine', 'isolation', 'debutant', 'Marche, course ou sprint selon l''objectif de la séance.', true),
('Assault bike', 'Full Body / Cardio', null, 'Machine', 'compose', 'intermediaire', 'Vélo à bras et jambes, idéal pour des intervalles courts et intenses.', true),
('Battle ropes', 'Full Body / Cardio', null, 'Autre', 'compose', 'intermediaire', 'Vagues ou claquements de corde en alternant les bras.', true),
('Sled push', 'Full Body / Cardio', null, 'Autre', 'compose', 'intermediaire', 'Pousse un traîneau chargé sur une distance donnée.', true),
('Sled pull', 'Full Body / Cardio', null, 'Autre', 'compose', 'intermediaire', 'Tire un traîneau vers toi à l''aide d''une corde.', true),
('Box jump', 'Full Body / Cardio', null, 'Autre', 'compose', 'intermediaire', 'Saut explosif sur une box, réceptionne en flexion contrôlée.', true),
('Tire flip', 'Full Body / Cardio', null, 'Autre', 'compose', 'avance', 'Retourne un gros pneu en utilisant les jambes et le dos, pas seulement les bras.', true);
