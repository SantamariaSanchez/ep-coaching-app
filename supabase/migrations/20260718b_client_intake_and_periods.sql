-- Fiche client complète — reprend toutes les questions du questionnaire
-- d'onboarding envoyé par email (aucune de ces infos n'existait en base :
-- le coach devait relire l'email à chaque fois). Le coach remplit ça
-- manuellement une fois par client depuis l'onglet "Profil complet", et
-- ces infos servent ensuite de référence dans le reste de l'appli
-- (créateur de recette, créateur de programme, plans nutrition...) sans
-- avoir à reposer les mêmes questions (régime, allergies...).

CREATE TABLE IF NOT EXISTS public.client_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Informations générales
  date_of_birth date,
  gender text CHECK (gender IN ('Homme', 'Femme', 'Autre')),
  occupation text,
  work_hours text,
  schedule_type text CHECK (schedule_type IN ('fixe', 'variable')),

  -- Objectifs
  goal_3_months text,
  goal_12_months text,
  how_coach_can_help text,

  -- Santé et récupération
  avg_daily_steps integer,
  wearable_device text,
  stress_level integer CHECK (stress_level BETWEEN 1 AND 10),
  sleep_quality integer CHECK (sleep_quality BETWEEN 1 AND 10),
  sleep_hours numeric,
  health_issues text,
  injuries text,

  -- Nutrition
  meals_current integer,
  meals_ideal integer,
  typical_day text,
  known_calories integer,
  known_protein integer,
  known_carbs integer,
  known_fat integer,
  cheat_meals_per_week integer,
  cheat_meal_impact text,
  supplement_budget numeric,
  disliked_foods text,
  liked_foods text,
  dietary_restrictions text,
  diet_type text CHECK (diet_type IN ('omnivore', 'vegetarien', 'vegan', 'pescetarien')),
  allergens text[] DEFAULT '{}',
  plan_preference text CHECK (plan_preference IN ('fixe', 'flexible')),
  calorie_preference text CHECK (calorie_preference IN ('lineaire', 'variable')),

  -- Entraînement
  sessions_current integer,
  sessions_desired integer,
  session_duration text,
  availability text,
  cardio_preference text,
  current_routine text,
  exercises_that_work text,
  exercises_problematic text,
  preferred_split text,
  disliked_equipment text,

  -- Salle de sport
  gym_name text,
  gym_link text,

  -- Autre
  additional_notes text,

  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_intake_client_id ON public.client_intake (client_id);

ALTER TABLE IF EXISTS public.client_intake DISABLE ROW LEVEL SECURITY;

-- Suivi du cycle menstruel — onglet affiché uniquement quand
-- client_intake.gender = 'Femme'. Le coach ou la cliente loggue le début
-- (et la fin) de chaque cycle, l'appli calcule la durée moyenne et la
-- prochaine date estimée à partir de l'historique.
CREATE TABLE IF NOT EXISTS public.period_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  flow text CHECK (flow IN ('leger', 'moyen', 'abondant')),
  symptoms text[] DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_period_logs_client_id ON public.period_logs (client_id, start_date DESC);

ALTER TABLE IF EXISTS public.period_logs DISABLE ROW LEVEL SECURITY;
