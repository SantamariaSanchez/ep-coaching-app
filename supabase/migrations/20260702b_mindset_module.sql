-- EP Coaching — Module Psychologie / Mindset
-- Exécute dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.mindset_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  profile_type text CHECK (profile_type IN ('competiteur', 'pratiquant', 'debutant')),
  environment text, -- 'etudiant', 'salarie', 'independant', 'parent', 'autre'
  main_obstacle text, -- 'motivation', 'stress', 'image_corporelle', 'discipline', 'social', 'autre'
  motivation_score integer,
  body_image_score integer,
  stress_score integer,
  discipline_score integer,
  quiz_completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mindset_habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_key text NOT NULL,
  logged_at date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, habit_key, logged_at)
);

CREATE TABLE IF NOT EXISTS public.mindset_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT current_date,
  prompt_key text,
  content text NOT NULL,
  mood integer CHECK (mood BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mindset_habit_logs_client_date
  ON public.mindset_habit_logs (client_id, logged_at);

CREATE INDEX IF NOT EXISTS idx_mindset_journal_client_date
  ON public.mindset_journal_entries (client_id, entry_date DESC);

-- App-layer security via server action guards (requireClient/requireCoach),
-- consistent with the rest of the schema.
ALTER TABLE IF EXISTS public.mindset_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mindset_habit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mindset_journal_entries DISABLE ROW LEVEL SECURITY;
