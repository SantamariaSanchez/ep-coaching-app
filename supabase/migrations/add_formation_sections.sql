-- =====================================================
-- MIGRATION: Formation 4-level hierarchy
-- Formation → Module → Section → Lesson
-- Run in Supabase SQL editor
-- =====================================================

-- 1. Create formation_sections table
CREATE TABLE IF NOT EXISTS formation_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES formation_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add section_id to formation_lessons
ALTER TABLE formation_lessons
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES formation_sections(id) ON DELETE CASCADE;

-- 3. Make module_id nullable (new lessons use section_id)
ALTER TABLE formation_lessons
  ALTER COLUMN module_id DROP NOT NULL;

-- =====================================================
-- SEED: FORMATION EXERCICES — EP COACHING
-- 7 modules, 53 sections, ~106 vidéos
-- =====================================================

DO $$
DECLARE
  v_form uuid;
  v_m1 uuid; v_m2 uuid; v_m3 uuid; v_m4 uuid; v_m5 uuid; v_m6 uuid; v_m7 uuid;
  v_s uuid;
BEGIN
  -- Update existing formation or use first available
  UPDATE formations
  SET title = 'FORMATION EXERCICES — EP COACHING',
      slug  = 'formation-exercices',
      subtitle = 'Maîtrisez les fondamentaux du coaching en musculation'
  WHERE id = (SELECT id FROM formations ORDER BY created_at LIMIT 1)
  RETURNING id INTO v_form;

  IF v_form IS NULL THEN
    SELECT id INTO v_form FROM formations LIMIT 1;
  END IF;

  -- Delete existing modules (cascades to sections & lessons)
  DELETE FROM formation_modules WHERE formation_id = v_form;

  -- ============ MODULE 1 — ANATOMIE FONCTIONNELLE ============
  INSERT INTO formation_modules (formation_id, title, order_index)
  VALUES (v_form, 'MODULE 1 — ANATOMIE FONCTIONNELLE', 1)
  RETURNING id INTO v_m1;

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m1, 'Comprendre le muscle', 1) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'C''est quoi un muscle et comment il fonctionne', 1, false, 10),
    (v_s, 'Origine, insertion et ventre musculaire', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m1, 'Groupes musculaires haut du corps', 2) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Pectoraux, deltoïdes, trapèzes', 1, false, 10),
    (v_s, 'Grand dorsal, rhomboïdes, érecteurs', 2, false, 10),
    (v_s, 'Biceps, triceps, avant-bras', 3, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m1, 'Groupes musculaires bas du corps', 3) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Quadriceps, ischio-jambiers, fessiers', 1, false, 10),
    (v_s, 'Mollets, tibiaux antérieurs, adducteurs', 2, false, 10),
    (v_s, 'Psoas et muscles profonds', 3, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m1, 'Types de fibres musculaires', 4) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Fibres lentes vs rapides : rôles et réponses à l''entraînement', 1, false, 10),
    (v_s, 'Composition en fibres selon les muscles', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m1, 'Mécanismes de contraction', 5) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Le cycle acto-myosine : comment le muscle génère de la force', 1, false, 10),
    (v_s, 'Le rôle du calcium et de l''ATP', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m1, 'Connexion nerf-muscle', 6) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'L''unité motrice : recrutement et ordonnancement', 1, false, 10),
    (v_s, 'Stimuli nerveux et commande centrale', 2, false, 10),
    (v_s, 'La fatigue neuromusculaire', 3, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m1, 'Courbe force-longueur', 7) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'La courbe force-longueur : comprendre les zones optimales', 1, false, 10),
    (v_s, 'Application pratique à la programmation', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m1, 'Courbe force-vitesse', 8) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Relation force-vitesse et ses implications', 1, false, 10),
    (v_s, 'Vitesse de contraction et expression de force', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m1, 'Hypertrophie musculaire', 9) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Les 3 mécanismes (tension mécanique, stress métabolique, dommages musculaires)', 1, false, 10),
    (v_s, 'Synthèse protéique et signalisation mTOR', 2, false, 10),
    (v_s, 'Facteurs hormonaux et environnement anabolique', 3, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m1, 'Récupération et adaptation', 10) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Supercompensation et fenêtre d''adaptation', 1, false, 10),
    (v_s, 'Rôle du sommeil et de la nutrition dans la récupération', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m1, 'Application anatomique au coaching', 11) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Lire un corps : identifier les dominantes et faiblesses anatomiques', 1, false, 10),
    (v_s, 'Adapter l''entraînement aux morphologies individuelles', 2, false, 10);

  -- ============ MODULE 2 — TECHNIQUE D'EXÉCUTION PAR EXERCICE ============
  INSERT INTO formation_modules (formation_id, title, order_index)
  VALUES (v_form, 'MODULE 2 — TECHNIQUE D''EXÉCUTION PAR EXERCICE', 2)
  RETURNING id INTO v_m2;

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m2, 'Squat', 1) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Analyse biomécanique et anatomie impliquée', 1, false, 10),
    (v_s, 'Erreurs fréquentes et corrections', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m2, 'Deadlift / Soulevé de terre', 2) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Analyse biomécanique et anatomie impliquée', 1, false, 10),
    (v_s, 'Erreurs fréquentes et corrections', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m2, 'Développé couché (Bench Press)', 3) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Analyse biomécanique et anatomie impliquée', 1, false, 10),
    (v_s, 'Erreurs fréquentes et corrections', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m2, 'Rowing', 4) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Analyse biomécanique et anatomie impliquée', 1, false, 10),
    (v_s, 'Erreurs fréquentes et corrections', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m2, 'Développé militaire (Overhead Press)', 5) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Analyse biomécanique et anatomie impliquée', 1, false, 10),
    (v_s, 'Erreurs fréquentes et corrections', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m2, 'Tractions / Tirage', 6) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Analyse biomécanique et anatomie impliquée', 1, false, 10),
    (v_s, 'Erreurs fréquentes et corrections', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m2, 'Hip Thrust / Fentes', 7) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Analyse biomécanique et anatomie impliquée', 1, false, 10),
    (v_s, 'Erreurs fréquentes et corrections', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m2, 'Curl biceps et extensions triceps', 8) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Analyse biomécanique et anatomie impliquée', 1, false, 10),
    (v_s, 'Erreurs fréquentes et corrections', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m2, 'Exercices d''isolation épaules et dos', 9) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Analyse biomécanique et anatomie impliquée', 1, false, 10),
    (v_s, 'Erreurs fréquentes et corrections', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m2, 'Exercices de gainage et core', 10) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Analyse biomécanique et anatomie impliquée', 1, false, 10),
    (v_s, 'Erreurs fréquentes et corrections', 2, false, 10);

  -- ============ MODULE 3 — PROFILS DE RÉSISTANCE ============
  INSERT INTO formation_modules (formation_id, title, order_index)
  VALUES (v_form, 'MODULE 3 — PROFILS DE RÉSISTANCE', 3)
  RETURNING id INTO v_m3;

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m3, 'Introduction aux profils de résistance', 1) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Qu''est-ce qu''un profil de résistance ?', 1, false, 10),
    (v_s, 'Pourquoi c''est capital pour la sélection d''exercices', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m3, 'Résistance ascendante', 2) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Caractéristiques et exemples d''exercices', 1, false, 10),
    (v_s, 'Comment exploiter ce profil', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m3, 'Résistance descendante', 3) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Caractéristiques et exemples d''exercices', 1, false, 10),
    (v_s, 'Comment exploiter ce profil', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m3, 'Résistance en forme de cloche', 4) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Caractéristiques et exemples d''exercices', 1, false, 10),
    (v_s, 'Comment exploiter ce profil', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m3, 'Profils de résistance et bandes élastiques', 5) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Modifier le profil de résistance avec les bandes', 1, false, 10),
    (v_s, 'Applications pratiques et combinaisons', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m3, 'Match profil de résistance / courbe force-longueur', 6) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Aligner le profil de résistance avec la courbe force-longueur optimale', 1, false, 10),
    (v_s, 'Exemples par groupe musculaire', 2, false, 10);

  -- ============ MODULE 4 — STANDARDISATION ============
  INSERT INTO formation_modules (formation_id, title, order_index)
  VALUES (v_form, 'MODULE 4 — STANDARDISATION', 4)
  RETURNING id INTO v_m4;

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m4, 'Pourquoi standardiser ?', 1) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'L''importance de la reproductibilité en entraînement', 1, false, 10),
    (v_s, 'Erreurs de mesure et biais sans standardisation', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m4, 'Standardiser les exercices', 2) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Variables à fixer : grip, stance, ROM, tempo', 1, false, 10),
    (v_s, 'Protocoles de référence par exercice', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m4, 'Standardiser la charge et les répétitions', 3) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Choisir un système : % de 1RM, RPE, RIR', 1, false, 10),
    (v_s, 'Avantages et limites de chaque méthode', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m4, 'Standardiser la récupération', 4) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Durée et qualité du repos inter-séries', 1, false, 10),
    (v_s, 'Protocoles de récupération cohérents', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m4, 'Standardiser l''environnement d''entraînement', 5) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Échauffement, ordre des exercices, conditions', 1, false, 10),
    (v_s, 'Tenir un journal d''entraînement efficace', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m4, 'Standardiser l''évaluation', 6) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Protocoles de tests et réévaluations', 1, false, 10),
    (v_s, 'Interprétation des progrès dans un cadre standardisé', 2, false, 10);

  -- ============ MODULE 5 — SÉLECTION DES EXERCICES ============
  INSERT INTO formation_modules (formation_id, title, order_index)
  VALUES (v_form, 'MODULE 5 — SÉLECTION DES EXERCICES', 5)
  RETURNING id INTO v_m5;

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m5, 'Principes de sélection', 1) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Critères de choix : objectif, anatomie, niveau, matériel', 1, false, 10),
    (v_s, 'Erreurs communes dans la sélection', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m5, 'Exercices de base vs isolation', 2) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Quand privilégier les mouvements polyarticulaires', 1, false, 10),
    (v_s, 'La place de l''isolation dans un programme', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m5, 'Sélection par groupe musculaire', 3) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Haut du corps : exemples et rationales', 1, false, 10),
    (v_s, 'Bas du corps : exemples et rationales', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m5, 'Sélection selon les profils de résistance', 4) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Choisir des exercices aux profils complémentaires', 1, false, 10),
    (v_s, 'Construire une bibliothèque d''exercices cohérente', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m5, 'Sélection et morphologie individuelle', 5) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Adapter les exercices aux leviers et mobilités du client', 1, false, 10),
    (v_s, 'Trouver les substituts efficaces', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m5, 'Sélection selon le contexte (matériel, blessures)', 6) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Exercices avec contraintes matérielles', 1, false, 10),
    (v_s, 'Exercices de contournement blessures courantes', 2, false, 10);

  -- ============ MODULE 6 — ERREURS FRÉQUENTES ============
  INSERT INTO formation_modules (formation_id, title, order_index)
  VALUES (v_form, 'MODULE 6 — ERREURS FRÉQUENTES', 6)
  RETURNING id INTO v_m6;

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m6, 'Erreurs de technique', 1) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Les 5 erreurs techniques universelles et leurs corrections', 1, false, 10),
    (v_s, 'Comment enseigner la correction sans frustrer le client', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m6, 'Erreurs de programmation', 2) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Trop de volume, mauvaise fréquence, absence de progression', 1, false, 10),
    (v_s, 'Les pièges classiques des débutants-intermédiaires', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m6, 'Erreurs de sélection d''exercices', 3) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Mauvaise adéquation exercice/objectif', 1, false, 10),
    (v_s, 'Ignorer le profil de résistance et la courbe force-longueur', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m6, 'Erreurs de charge et d''intensité', 4) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Toujours trop lourd ou toujours trop léger', 1, false, 10),
    (v_s, 'Mauvaise gestion du RPE et du RIR', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m6, 'Erreurs de récupération', 5) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Sous-récupération et surentraînement', 1, false, 10),
    (v_s, 'Sur-récupération et manque de stimulus', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m6, 'Erreurs de communication coach-client', 6) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Donner des consignes floues ou trop complexes', 1, false, 10),
    (v_s, 'Manque de feedback positif et de progression motivante', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m6, 'Erreurs d''évaluation et de suivi', 7) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Ne pas standardiser les tests', 1, false, 10),
    (v_s, 'Mauvaise interprétation des données de progression', 2, false, 10);

  -- ============ MODULE 7 — PROGRESSIONS ET RÉGRESSIONS ============
  INSERT INTO formation_modules (formation_id, title, order_index)
  VALUES (v_form, 'MODULE 7 — PROGRESSIONS ET RÉGRESSIONS', 7)
  RETURNING id INTO v_m7;

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m7, 'Principes de progression', 1) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Surcharge progressive : les 5 leviers d''adaptation', 1, false, 10),
    (v_s, 'Choisir le bon levier selon le profil du client', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m7, 'Progressions par exercice', 2) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Haut du corps : progressions linéaires et ondulatoires', 1, false, 10),
    (v_s, 'Bas du corps : progressions linéaires et ondulatoires', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m7, 'Régressions techniques', 3) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Quand et comment régresser un exercice', 1, false, 10),
    (v_s, 'Continuum de régression par exercice', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m7, 'Progressions pour débutants', 4) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Protocoles adaptés aux clients débutants', 1, false, 10),
    (v_s, 'Priorités : technique, consistance, puis charge', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m7, 'Progressions pour intermédiaires', 5) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Introduire la périodisation simple', 1, false, 10),
    (v_s, 'Gérer les plateaux et les stagnations', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m7, 'Progressions pour avancés', 6) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Périodisation bloc et ondulante pour profils avancés', 1, false, 10),
    (v_s, 'Gestion des pics de performance', 2, false, 10);

  INSERT INTO formation_sections (module_id, title, order_index) VALUES (v_m7, 'Construire un plan de progression sur mesure', 7) RETURNING id INTO v_s;
  INSERT INTO formation_lessons (section_id, title, order_index, is_published, duration_min) VALUES
    (v_s, 'Collecte des données et diagnostic initial', 1, false, 10),
    (v_s, 'Concevoir un plan 8-12 semaines personnalisé', 2, false, 10);

END $$;
