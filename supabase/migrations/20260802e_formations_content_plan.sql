-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Plan complet des 5 formations (sections, modules, videos)
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : les 5 formations existent déjà avec le bon titre. Cette
-- migration renseigne sous-titre + description, PUIS remplace tout le
-- contenu (sections/modules/videos) par le plan final. Le remplacement est
-- sans risque : aucune des lessons existantes n'a de youtube_id ni n'est
-- publiée (vérifié avant écriture de cette migration) — pas de contenu réel
-- en jeu, uniquement de la structure brouillon.
--
-- Rappel terminologie DB (l'UI affiche l'inverse, voir CoachFormationEditor) :
--   formation_modules  = "Section" à l'écran (regroupement large)
--   formation_sections = "Module" à l'écran (sous-regroupement numéroté Mx)
--   formation_lessons  = vidéo
-- ═══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_form uuid;
  v_mod uuid;
  v_sec uuid;
BEGIN

  -- ══════════ BODYBUILDING BLUEPRINT ══════════
  SELECT id INTO v_form FROM formations WHERE title ILIKE '%BODYBUILDING BLUEPRINT%' LIMIT 1;
  IF v_form IS NULL THEN
    RAISE NOTICE 'Formation introuvable pour %, ignorée.', 'BODYBUILDING BLUEPRINT';
  ELSE
    UPDATE formations SET subtitle = 'Comprendre, préparer, concourir.', description = 'Tout ce qu''il faut pour passer de pratiquant à compétiteur. Les connaissances, les compétences et l''entourage réunis dans un seul plan clair, de l''histoire du sport jusqu''à ton premier passage sur scène.' WHERE id = v_form;
    DELETE FROM formation_modules WHERE formation_id = v_form;

    INSERT INTO formation_modules (formation_id, title, order_index) VALUES (v_form, 'Connaissances', 1) RETURNING id INTO v_mod;
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Histoire du bodybuilding', 1) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Les origines et l''âge d''or', 1, false, 10),
      (v_sec, 'De l''âge d''or à aujourd''hui', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Fédérations et catégories', 2) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Panorama des fédérations', 1, false, 10),
      (v_sec, 'Les catégories et comment choisir la sienne', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Grandes figures', 3) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Les légendes qui ont façonné le sport', 1, false, 10),
      (v_sec, 'Les figures actuelles qui inspirent', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Anatomie et physiologie de base', 4) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Les groupes musculaires et leur fonction', 1, false, 10),
      (v_sec, 'Comment le muscle grandit', 2, false, 10),
      (v_sec, 'Effort, récupération, adaptation', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Pourquoi faire du bodybuilding', 5) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Le bodybuilding comme outil de construction de soi', 1, false, 10),
      (v_sec, 'Ce que ça t''apprend au-delà du physique', 2, false, 10);

    INSERT INTO formation_modules (formation_id, title, order_index) VALUES (v_form, 'Compétences', 2) RETURNING id INTO v_mod;
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Construire un plan de préparation', 1) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Définir son objectif et sa timeline', 1, false, 10),
      (v_sec, 'Les grandes phases d''une prep', 2, false, 10),
      (v_sec, 'Structurer sa prep sur le calendrier', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Piloter l''entraînement en prep', 2) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Adapter volume et intensité selon la phase', 1, false, 10),
      (v_sec, 'Ajuster selon fatigue et récupération', 2, false, 10),
      (v_sec, 'Erreurs fréquentes de pilotage', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Piloter la nutrition en prep', 3) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Ajuster les calories selon la phase', 1, false, 10),
      (v_sec, 'Le peak week (eau, sel, glucides)', 2, false, 10),
      (v_sec, 'Gérer les écarts et imprévus', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Gérer le mental en prep', 4) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Tenir la discipline sur plusieurs mois', 1, false, 10),
      (v_sec, 'Gérer la pression avant une compétition', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Le jour J', 5) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Préparation physique le jour J', 1, false, 10),
      (v_sec, 'Le posing, bases et présentation', 2, false, 10),
      (v_sec, 'Gérer le stress et la scène', 3, false, 10);

    INSERT INTO formation_modules (formation_id, title, order_index) VALUES (v_form, 'Entourage', 3) RETURNING id INTO v_mod;
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Choisir sa fédération et sa compétition', 1) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Comment choisir sa fédération selon son profil', 1, false, 10),
      (v_sec, 'Trouver et s''inscrire à sa première compétition', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Comprendre le monde des compétiteurs', 2) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Qui sont les compétiteurs, comment ils fonctionnent', 1, false, 10),
      (v_sec, 'Culture et codes du milieu compétitif', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Construire son équipe', 3) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Coach, posing coach, bronzeur, qui et pourquoi', 1, false, 10),
      (v_sec, 'Bien collaborer avec son équipe', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Le circuit compétitif', 4) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Comprendre calendrier et qualifications', 1, false, 10),
      (v_sec, 'Passer au circuit supérieur', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'L''après compétition', 5) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'La transition post-compet (reverse diet, mental)', 1, false, 10),
      (v_sec, 'Capitaliser sur l''expérience', 2, false, 10);
  END IF;

  -- ══════════ NUTRITION MASTERY ══════════
  SELECT id INTO v_form FROM formations WHERE title ILIKE '%NUTRITION MASTERY%' LIMIT 1;
  IF v_form IS NULL THEN
    RAISE NOTICE 'Formation introuvable pour %, ignorée.', 'NUTRITION MASTERY';
  ELSE
    UPDATE formations SET subtitle = 'Comprendre. Appliquer. Tenir.', description = 'La formation nutrition complète pour construire ton physique et le tenir dans la vraie vie. De la science de base jusqu''à l''application concrète et la gestion de ton entourage, en 34 vidéos. Chaque affirmation est sourcée sur des études, rien d''inventé.' WHERE id = v_form;
    DELETE FROM formation_modules WHERE formation_id = v_form;

    INSERT INTO formation_modules (formation_id, title, order_index) VALUES (v_form, 'Connaissances', 1) RETURNING id INTO v_mod;
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Les bases énergétiques', 1) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'C''est quoi une calorie', 1, false, 10),
      (v_sec, 'La balance énergétique', 2, false, 10),
      (v_sec, 'Les composantes de la dépense', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Les macronutriments', 2) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Les protéines', 1, false, 10),
      (v_sec, 'Les glucides', 2, false, 10),
      (v_sec, 'Les lipides', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Micronutriments & santé', 3) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Vitamines et minéraux', 1, false, 10),
      (v_sec, 'Carences, hydratation, électrolytes', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Digestion & assimilation', 4) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Comment le corps digère', 1, false, 10),
      (v_sec, 'Biodisponibilité & assimilation', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Les mythes démontés', 5) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Les mythes énergétiques', 1, false, 10),
      (v_sec, 'Les mythes alimentaires', 2, false, 10);

    INSERT INTO formation_modules (formation_id, title, order_index) VALUES (v_form, 'Compétences', 2) RETURNING id INTO v_mod;
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Calculer ses besoins', 1) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Estimer sa dépense', 1, false, 10),
      (v_sec, 'Poser calories et macros', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Construire ses repas', 2) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Structurer sa journée', 1, false, 10),
      (v_sec, 'Composer un repas', 2, false, 10),
      (v_sec, 'Variété et rotation', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Ajuster selon l''objectif', 3) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Piloter une prise de masse', 1, false, 10),
      (v_sec, 'Piloter un déficit', 2, false, 10),
      (v_sec, 'Maintenance, diet break, refeed', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Gérer les contextes réels', 4) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Resto, sorties, alcool', 1, false, 10),
      (v_sec, 'Voyage, imprévus, semaine chargée', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Adapter selon la personne', 5) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Adapter à la personne', 1, false, 10),
      (v_sec, 'Flexible vs rigide', 2, false, 10);

    INSERT INTO formation_modules (formation_id, title, order_index) VALUES (v_form, 'Entourage', 3) RETURNING id INTO v_mod;
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Ton environnement décide', 1) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'L''environnement bat la volonté', 1, false, 10),
      (v_sec, 'Construire un environnement gagnant', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Manger avec les autres', 2) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Famille, couple, colocs', 1, false, 10),
      (v_sec, 'Repas partagés, invitations', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'La pression sociale', 3) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Le regard et les remarques', 1, false, 10),
      (v_sec, 'Les normes de groupe', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'T''entourer des bonnes personnes', 4) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Ton cercle te façonne', 1, false, 10),
      (v_sec, 'Construire ton équipe', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Le rapport sain à la nourriture', 5) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Sortir du tout-ou-rien', 1, false, 10),
      (v_sec, 'Un rapport durable', 2, false, 10);
  END IF;

  -- ══════════ TRAINING ══════════
  SELECT id INTO v_form FROM formations WHERE title ILIKE '%TRAINING%' LIMIT 1;
  IF v_form IS NULL THEN
    RAISE NOTICE 'Formation introuvable pour %, ignorée.', 'TRAINING';
  ELSE
    UPDATE formations SET subtitle = 'Comprendre ce qui fait grossir un muscle, et savoir piloter ton entraînement avec tes propres données.', description = 'Une formation en deux sections qui part des mécanismes réels de l''hypertrophie pour arriver à un système d''entraînement que tu pilotes toi-même. La section Compétences suit le cas de Marc, en stagnation depuis huit mois, du diagnostic jusqu''à six mois de progression mesurée.' WHERE id = v_form;
    DELETE FROM formation_modules WHERE formation_id = v_form;

    INSERT INTO formation_modules (formation_id, title, order_index) VALUES (v_form, 'Connaissances', 1) RETURNING id INTO v_mod;
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Anatomie fonctionnelle', 1) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Du sarcomère au mouvement', 1, false, 10),
      (v_sec, 'Articulations, leviers et plans de mouvement', 2, false, 10),
      (v_sec, 'Rôles musculaires et cartographie réelle', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Mécanismes de l''hypertrophie', 2) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'La tension mécanique, le seul moteur prouvé', 1, false, 10),
      (v_sec, 'Les faux mécanismes', 2, false, 10),
      (v_sec, 'De la tension à la fibre qui grossit', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Profils de résistance', 3) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Lire le profil de résistance d''un exercice', 1, false, 10),
      (v_sec, 'Couvrir tout le profil d''un muscle', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Volume, intensité, fréquence', 4) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Le volume, la variable qui pilote tout', 1, false, 10),
      (v_sec, 'Charge et proximité à l''échec', 2, false, 10),
      (v_sec, 'Fréquence et répartition du travail', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Récupération et surcompensation', 5) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Ce qui se passe entre deux séances', 1, false, 10),
      (v_sec, 'Piloter la fatigue, le sommeil et le deload', 2, false, 10);

    INSERT INTO formation_modules (formation_id, title, order_index) VALUES (v_form, 'Compétences', 2) RETURNING id INTO v_mod;
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Technique d''exécution', 1) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Les invariants techniques', 1, false, 10),
      (v_sec, 'Tempo, amplitude et contrôle', 2, false, 10),
      (v_sec, 'Setup, stabilité et respiration', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Sélection des exercices', 2) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Les critères de sélection', 1, false, 10),
      (v_sec, 'Construire ton pool par muscle', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Construire un programme', 3) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'La structure hebdomadaire', 1, false, 10),
      (v_sec, 'Construire une séance', 2, false, 10),
      (v_sec, 'Blocs et périodisation utile', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Piloter la progression', 4) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'La surcharge progressive réelle', 1, false, 10),
      (v_sec, 'Le carnet et les données qui comptent', 2, false, 10),
      (v_sec, 'Décider quoi ajuster', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Corriger les erreurs', 5) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Diagnostiquer une stagnation', 1, false, 10),
      (v_sec, 'Corriger et construire la suite', 2, false, 10);
  END IF;

  -- ══════════ ENTREPRENARIAL SECRET ══════════
  SELECT id INTO v_form FROM formations WHERE title ILIKE '%ENTREPRENARIAL SECRET%' LIMIT 1;
  IF v_form IS NULL THEN
    RAISE NOTICE 'Formation introuvable pour %, ignorée.', 'ENTREPRENARIAL SECRET';
  ELSE
    UPDATE formations SET subtitle = 'Construire une entreprise en ligne qui tient, du premier client au douzième mois.', description = '32 vidéos qui couvrent la construction complète d''une activité de coaching en ligne, du cadre économique jusqu''aux relations qui la portent. La section Compétences suit Thomas, coach salarié qui démarre à zéro client, jusqu''à son bilan à dix-huit mois.' WHERE id = v_form;
    DELETE FROM formation_modules WHERE formation_id = v_form;

    INSERT INTO formation_modules (formation_id, title, order_index) VALUES (v_form, 'Connaissances', 1) RETURNING id INTO v_mod;
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Bases business en ligne', 1) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Ce qu''est vraiment une entreprise en ligne', 1, false, 10),
      (v_sec, 'Le marché, la demande et pourquoi ça meurt', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Modèles économiques', 2) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Anatomie d''un modèle économique', 1, false, 10),
      (v_sec, 'Les modèles qui tiennent en coaching en ligne', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Finance et gestion', 3) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Lire ses chiffres sans se mentir', 1, false, 10),
      (v_sec, 'La trésorerie, la vraie cause de la mort', 2, false, 10),
      (v_sec, 'Prix, marge et valeur client', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Marketing et acquisition', 4) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Comprendre l''acquisition', 1, false, 10),
      (v_sec, 'Pourquoi un contenu circule', 2, false, 10),
      (v_sec, 'Canaux, mesure et arbitrage', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Vendre sans se trahir', 5) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'La vente est un diagnostic', 1, false, 10),
      (v_sec, 'Confiance, objections et le prix', 2, false, 10);

    INSERT INTO formation_modules (formation_id, title, order_index) VALUES (v_form, 'Compétences', 2) RETURNING id INTO v_mod;
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Construire son offre', 1) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Choisir à qui tu parles', 1, false, 10),
      (v_sec, 'Construire la promesse et le contenu', 2, false, 10),
      (v_sec, 'Tester et corriger son offre', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Contenu qui convertit', 2) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Construire son système de contenu', 1, false, 10),
      (v_sec, 'Écrire ce qui fait basculer', 2, false, 10),
      (v_sec, 'Mesurer et corriger son contenu', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Gérer ses clients', 3) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Démarrer un client correctement', 1, false, 10),
      (v_sec, 'Garder ses clients et réparer', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Organiser son temps', 4) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Diagnostiquer où passe ton temps', 1, false, 10),
      (v_sec, 'Reconstruire sa semaine', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Scaler', 5) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Décider si tu dois scaler', 1, false, 10),
      (v_sec, 'Douze mois plus tard, le bilan', 2, false, 10);

    INSERT INTO formation_modules (formation_id, title, order_index) VALUES (v_form, 'Entourage', 3) RETURNING id INTO v_mod;
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Les bonnes personnes', 1) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Ce que ton entourage te fait', 1, false, 10),
      (v_sec, 'Choisir, ajuster et parfois s''éloigner', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Mentors et pairs', 2) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Ce qu''un mentor apporte vraiment', 1, false, 10),
      (v_sec, 'Les pairs, le levier sous-estimé', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Image', 3) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Comment on te juge', 1, false, 10),
      (v_sec, 'Construire une image vraie', 2, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Réseau', 4) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'L''architecture d''un réseau qui sert', 1, false, 10),
      (v_sec, 'Entretenir, donner, et conclure', 2, false, 10);
  END IF;

  -- ══════════ PSYCHOLOGIE AFFECT ══════════
  SELECT id INTO v_form FROM formations WHERE title ILIKE '%PSYCHOLOGIE AFFECT%' LIMIT 1;
  IF v_form IS NULL THEN
    RAISE NOTICE 'Formation introuvable pour %, ignorée.', 'PSYCHOLOGIE AFFECT';
  ELSE
    UPDATE formations SET subtitle = 'Les biais qui décident à ta place, en salle et en business.', description = 'Sept modules sur les mécanismes qui pilotent tes décisions sans te demander ton avis, appliqués à la musculation et à la construction d''une activité. Biais cognitifs uniquement.' WHERE id = v_form;
    DELETE FROM formation_modules WHERE formation_id = v_form;

    INSERT INTO formation_modules (formation_id, title, order_index) VALUES (v_form, 'Le système', 1) RETURNING id INTO v_mod;
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Biais cognitifs', 1) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Comment ta tête décide vraiment', 1, false, 10),
      (v_sec, 'Ce que tu crois savoir sur toi', 2, false, 10),
      (v_sec, 'Les biais qui pourrissent tes choix', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Effort et récompense', 2) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Comment ton cerveau paye l''effort', 1, false, 10),
      (v_sec, 'Le décalage entre l''effort et le résultat', 2, false, 10),
      (v_sec, 'Fabriquer une récompense qui tient', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Motivation et discipline', 3) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'La motivation est un état', 1, false, 10),
      (v_sec, 'Ce que la discipline est vraiment', 2, false, 10),
      (v_sec, 'Un système qui n''a pas besoin de toi', 3, false, 10);

    INSERT INTO formation_modules (formation_id, title, order_index) VALUES (v_form, 'Le regard', 2) RETURNING id INTO v_mod;
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Comparaison sociale', 1) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Pourquoi tu te compares', 1, false, 10),
      (v_sec, 'Ce que les réseaux font à cette machine', 2, false, 10),
      (v_sec, 'Reprendre la main sur tes comparaisons', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Image de soi', 2) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'L''image de soi n''est pas un miroir', 1, false, 10),
      (v_sec, 'Quand la recherche de muscle se retourne', 2, false, 10),
      (v_sec, 'Une relation stable avec ton corps', 3, false, 10);

    INSERT INTO formation_modules (formation_id, title, order_index) VALUES (v_form, 'L''action', 3) RETURNING id INTO v_mod;
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Peur de l''échec', 1) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'Ce que tu protèges vraiment', 1, false, 10),
      (v_sec, 'Les stratégies d''évitement', 2, false, 10),
      (v_sec, 'Baisser l''enjeu au lieu de la peur', 3, false, 10);
    INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_mod, 'Pièges de l''entrepreneur', 2) RETURNING id INTO v_sec;
    INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
      (v_sec, 'La confiance du départ', 1, false, 10),
      (v_sec, 'Continuer alors que ça ne marche pas', 2, false, 10),
      (v_sec, 'Tenir sur la durée', 3, false, 10);
  END IF;
END $$;
