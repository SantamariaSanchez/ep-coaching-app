-- Complète les groupes musculaires les plus légers de la bibliothèque
-- (adducteurs, trapèzes, avant-bras) avec des mouvements distincts non
-- déjà présents — pas de doublon avec les entrées existantes des deux
-- migrations précédentes (20260705, 20260707), vérifié programmatiquement.

INSERT INTO public.exercise_library (name, muscle_group, muscle_subgroup, equipment, category, difficulty, instructions, is_official) VALUES

('Cossack squat', 'Adducteurs', 'Grand adducteur', 'Poids du corps', 'compose', 'avance', 'Squat latéral profond, une jambe pliée l''autre tendue sur le côté, excellent pour la mobilité et la force des adducteurs.', true),
('Adduction isométrique au sol', 'Adducteurs', 'Long adducteur', 'Poids du corps', 'isolation', 'debutant', 'Allongé sur le côté, jambe du dessous décollée légèrement du sol, maintiens la contraction.', true),

('Y-raise (trapèze inférieur)', 'Trapèzes', 'Trapèze inférieur', 'Haltères', 'isolation', 'intermediaire', 'Buste penché, lève les bras en formant un Y, cible spécifiquement le trapèze inférieur souvent négligé.', true),
('Scapular pull-up', 'Trapèzes', 'Trapèze moyen', 'Poids du corps', 'isolation', 'intermediaire', 'Suspendu à la barre, bras tendus, rapproche uniquement les omoplates sans plier les coudes.', true),

('Curl poignet marteau (grip)', 'Avant-bras', 'Fléchisseurs', 'Haltères', 'isolation', 'debutant', 'Prise neutre, enroule uniquement le poignet, renforce la préhension en complément du curl marteau classique.', true),
('Extension doigts (bande élastique)', 'Avant-bras', 'Extenseurs', 'Autre', 'isolation', 'debutant', 'Élastique autour des doigts, ouvre la main contre la résistance — équilibre les fléchisseurs souvent sur-travaillés.', true);
