-- Diet plans: optional weekly structure (different meals per day of the
-- week, plus an optional "jour high" profile e.g. for a refeed day) on top
-- of the existing simple daily structure. Fully backward-compatible:
-- existing plans get structure='daily' and day_of_week=NULL, unchanged.
ALTER TABLE public.diet_plans
  ADD COLUMN IF NOT EXISTS structure text NOT NULL DEFAULT 'daily' CHECK (structure IN ('daily', 'weekly'));

ALTER TABLE public.diet_plan_meals
  ADD COLUMN IF NOT EXISTS day_of_week text
    CHECK (day_of_week IN ('lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim', 'high'));
