-- Nutrition profiles: dedupe stray rows then enforce one row per client.
-- Some environments accumulated duplicate nutrition_profiles rows because the
-- app's upsert(onConflict: "client_id") silently falls back to INSERT when no
-- matching unique constraint exists — this made saved TDEE targets look like
-- they "reverted" to old data (an arbitrary older row kept getting returned).

-- Keep only the most recently updated row per client_id.
DELETE FROM public.nutrition_profiles a
WHERE a.id NOT IN (
  SELECT DISTINCT ON (client_id) id
  FROM public.nutrition_profiles
  ORDER BY client_id, updated_at DESC NULLS LAST, id DESC
);

-- Now that duplicates are gone, make sure the constraint actually exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nutrition_profiles_client_id_key'
  ) THEN
    ALTER TABLE public.nutrition_profiles
      ADD CONSTRAINT nutrition_profiles_client_id_key UNIQUE (client_id);
  END IF;
END $$;
