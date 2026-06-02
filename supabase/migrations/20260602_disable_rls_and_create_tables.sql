-- ═══════════════════════════════════════════════════════════
-- EP Coaching — Disable RLS + Create missing tables
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── 1. CRÉE LES TABLES MANQUANTES ──────────────────────────

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'voice')),
  content text,
  voice_url text,
  voice_duration_seconds integer,
  is_read boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  subscription jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  calories_per_100 numeric NOT NULL DEFAULT 0,
  proteins_per_100 numeric NOT NULL DEFAULT 0,
  carbs_per_100 numeric NOT NULL DEFAULT 0,
  fats_per_100 numeric NOT NULL DEFAULT 0,
  fibers_per_100 numeric DEFAULT 0,
  is_custom boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.food_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_id uuid REFERENCES public.foods(id) ON DELETE SET NULL,
  meal_slot text NOT NULL DEFAULT 'breakfast',
  quantity_g numeric NOT NULL DEFAULT 100,
  logged_at date NOT NULL DEFAULT current_date,
  calories numeric DEFAULT 0,
  proteins numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fats numeric DEFAULT 0,
  fibers numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nutrition_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  calories_target numeric,
  proteins_target numeric,
  carbs_target numeric,
  fats_target numeric,
  tdee numeric,
  bmr numeric,
  phase text CHECK (phase IN ('deficit', 'maintenance', 'surplus')),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid,
  day_label text NOT NULL DEFAULT 'Seance libre',
  muscle_groups text[],
  session_date date NOT NULL DEFAULT current_date,
  warmup_duration_seconds integer,
  warmup_validated boolean DEFAULT false,
  duration_minutes integer,
  general_feeling integer CHECK (general_feeling BETWEEN 1 AND 5),
  energy_level integer CHECK (energy_level BETWEEN 1 AND 5),
  pump integer CHECK (pump BETWEEN 1 AND 5),
  notes text,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.session_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  exercise_id uuid,
  exercise_name text NOT NULL,
  muscle_group text,
  set_number integer NOT NULL,
  reps_target text,
  reps_actual integer,
  weight_kg numeric,
  previous_weight_kg numeric,
  rir_target integer,
  rir_actual integer,
  standardization_score integer CHECK (standardization_score BETWEEN 1 AND 5),
  rest_duration_seconds integer,
  is_pr boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.personal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  weight_kg numeric NOT NULL,
  reps integer,
  achieved_at date DEFAULT current_date,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  time text NOT NULL,
  days text[] NOT NULL DEFAULT '{lun,mar,mer,jeu,ven,sam,dim}',
  is_active boolean DEFAULT true,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_by uuid REFERENCES auth.users(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.roadmap_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL REFERENCES public.roadmaps(id) ON DELETE CASCADE,
  type text NOT NULL,
  label text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  notes text,
  position integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.roadmap_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL REFERENCES public.roadmaps(id) ON DELETE CASCADE,
  type text NOT NULL,
  label text NOT NULL,
  target_date date NOT NULL,
  target_value numeric,
  target_unit text,
  description text,
  term text NOT NULL CHECK (term IN ('short', 'medium', 'long')),
  is_achieved boolean DEFAULT false,
  achieved_at date
);

CREATE TABLE IF NOT EXISTS public.coach_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_number integer,
  phase text,
  weight numeric,
  weight_variation numeric,
  observations text,
  nutrition_adjustments text,
  program_adjustments text,
  next_actions text,
  rating integer CHECK (rating BETWEEN 1 AND 10),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.key_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  decision_date date NOT NULL DEFAULT current_date,
  type text,
  decision text NOT NULL,
  reason text,
  result text,
  created_at timestamptz DEFAULT now()
);

-- ── 2. DÉSACTIVE RLS SUR TOUTES LES TABLES ─────────────────
-- App privée coach/client, pas besoin de RLS strict.
-- Le code utilise adminClient pour bypasser de toute façon.

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'profiles', 'check_ins', 'food_logs', 'foods',
    'nutrition_profiles', 'programs', 'program_days', 'exercises',
    'sessions', 'session_sets', 'personal_records', 'workout_logs',
    'measurements', 'coach_notes', 'key_decisions',
    'exercise_corrections', 'photo_updates', 'messages',
    'push_subscriptions', 'reminders', 'roadmaps',
    'roadmap_phases', 'roadmap_objectives', 'notes',
    'diet_plans', 'diet_plan_meals'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl);
    EXCEPTION WHEN undefined_table THEN
      -- Table doesn't exist yet, skip
      NULL;
    END;
  END LOOP;
END;
$$;

-- ── 3. ALIMENTS DE BASE ─────────────────────────────────────

INSERT INTO public.foods (name, category, calories_per_100, proteins_per_100, carbs_per_100, fats_per_100, fibers_per_100)
SELECT * FROM (VALUES
  ('Poulet blanc cuit', 'Viandes', 165, 31, 0, 3.6, 0),
  ('Boeuf hache 5%', 'Viandes', 135, 22, 0, 5, 0),
  ('Dinde escalope', 'Viandes', 135, 29, 0, 1.5, 0),
  ('Jambon blanc', 'Viandes', 107, 17, 1.5, 3.7, 0),
  ('Saumon cuit', 'Poissons', 208, 20, 0, 13, 0),
  ('Thon boite egoutte', 'Poissons', 116, 26, 0, 1, 0),
  ('Sardines boite', 'Poissons', 200, 24, 0, 11, 0),
  ('Cabillaud cuit', 'Poissons', 105, 23, 0, 1, 0),
  ('Crevettes cuites', 'Poissons', 99, 18, 0.2, 3, 0),
  ('Oeuf entier cuit', 'Oeufs', 155, 13, 1.1, 11, 0),
  ('Blanc oeuf cuit', 'Oeufs', 52, 11, 0.7, 0.2, 0),
  ('Riz blanc cuit', 'Feculents', 130, 2.7, 28, 0.3, 0.4),
  ('Riz complet cuit', 'Feculents', 123, 2.7, 26, 1, 1.8),
  ('Pates cuites', 'Feculents', 131, 5, 25, 1.1, 1.8),
  ('Patate douce cuite', 'Feculents', 86, 1.6, 20, 0.1, 3),
  ('Pomme de terre cuite', 'Feculents', 87, 1.9, 20, 0.1, 1.8),
  ('Flocons avoine', 'Cereales', 389, 17, 66, 7, 10),
  ('Pain complet', 'Cereales', 247, 9, 44, 3.4, 6.3),
  ('Quinoa cuit', 'Cereales', 120, 4.4, 22, 1.9, 2.8),
  ('Fromage blanc 0%', 'Laitiers', 46, 8, 4, 0.2, 0),
  ('Yaourt grec nature', 'Laitiers', 97, 9, 4, 5, 0),
  ('Lait demi-ecreme', 'Laitiers', 46, 3.2, 4.8, 1.5, 0),
  ('Cottage cheese', 'Laitiers', 98, 11, 3.4, 4.3, 0),
  ('Mozzarella', 'Laitiers', 280, 19, 2.2, 17, 0),
  ('Amandes', 'Oleagineux', 579, 21, 22, 50, 12.5),
  ('Noix', 'Oleagineux', 654, 15, 14, 65, 6.7),
  ('Beurre cacahuete', 'Oleagineux', 588, 25, 20, 50, 6),
  ('Avocat', 'Fruits', 160, 2, 9, 15, 6.7),
  ('Huile olive', 'Matieres grasses', 884, 0, 0, 100, 0),
  ('Banane', 'Fruits', 89, 1.1, 23, 0.3, 2.6),
  ('Pomme', 'Fruits', 52, 0.3, 14, 0.2, 2.4),
  ('Orange', 'Fruits', 47, 0.9, 12, 0.1, 2.4),
  ('Myrtilles', 'Fruits', 57, 0.7, 14, 0.3, 2.4),
  ('Epinards crus', 'Legumes', 23, 2.9, 3.6, 0.4, 2.2),
  ('Brocoli cuit', 'Legumes', 35, 2.4, 7.2, 0.4, 2.6),
  ('Tomate', 'Legumes', 18, 0.9, 3.9, 0.2, 1.2),
  ('Carottes crues', 'Legumes', 41, 0.9, 10, 0.2, 2.8),
  ('Lentilles cuites', 'Legumineuses', 116, 9, 20, 0.4, 7.9),
  ('Pois chiches cuits', 'Legumineuses', 164, 9, 27, 2.6, 7.6),
  ('Tofu ferme', 'Proteines vege', 76, 8, 1.9, 4.8, 0.3),
  ('Whey vanille', 'Complements', 370, 75, 10, 5, 0)
) AS t(name, category, calories_per_100, proteins_per_100, carbs_per_100, fats_per_100, fibers_per_100)
WHERE NOT EXISTS (SELECT 1 FROM public.foods LIMIT 1);

-- ── 4. REALTIME MESSAGES ────────────────────────────────────
-- Activer dans Dashboard > Database > Replication > messages
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
