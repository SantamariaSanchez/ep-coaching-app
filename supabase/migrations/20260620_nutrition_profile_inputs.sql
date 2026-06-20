-- Persist the raw inputs used to compute the TDEE/macro targets so the
-- nutrition form can be reloaded with the values the coach entered,
-- instead of relying on localStorage (which is per-browser/device only).
ALTER TABLE public.nutrition_profiles
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS height numeric,
  ADD COLUMN IF NOT EXISTS age numeric,
  ADD COLUMN IF NOT EXISTS training_type text,
  ADD COLUMN IF NOT EXISTS sessions_per_week numeric,
  ADD COLUMN IF NOT EXISTS session_duration numeric,
  ADD COLUMN IF NOT EXISTS steps_per_day numeric,
  ADD COLUMN IF NOT EXISTS activity_level numeric;
