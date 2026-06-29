-- EP Coaching — Annuaire des salles de musculation
-- Les membres (coach + clients gratuits/payants) partagent les salles où ils
-- s'entraînent (adresse, équipement dispo) et peuvent y laisser un avis noté.

CREATE TABLE IF NOT EXISTS public.gyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  address text,
  equipment_notes text,
  website text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gym_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gym_id, author_id)
);

CREATE INDEX IF NOT EXISTS idx_gyms_city ON public.gyms (city);
CREATE INDEX IF NOT EXISTS idx_gym_reviews_gym ON public.gym_reviews (gym_id);

ALTER TABLE IF EXISTS public.gyms DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gym_reviews DISABLE ROW LEVEL SECURITY;
