-- EP Coaching — Diet Plans tables
-- Exécute dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.diet_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('flexible', 'fixed', 'fixed_flexible')),
  is_active boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.diet_plan_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.diet_plans(id) ON DELETE CASCADE,
  meal_slot text NOT NULL,
  food_id uuid REFERENCES public.foods(id) ON DELETE SET NULL,
  quantity_g numeric NOT NULL DEFAULT 100,
  position integer DEFAULT 0
);

-- Also create photo_updates if not exists
CREATE TABLE IF NOT EXISTS public.photo_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'mandatory_poses',
  drive_link text,
  notes text,
  category text,
  week_number integer,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  coach_feedback text,
  coach_replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Disable RLS on new tables
ALTER TABLE IF EXISTS public.diet_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.diet_plan_meals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.photo_updates DISABLE ROW LEVEL SECURITY;
