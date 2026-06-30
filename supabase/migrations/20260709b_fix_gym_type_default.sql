-- 20260709_gym_type.sql added the `type` column with DEFAULT 'independante',
-- which silently backfilled EVERY pre-existing row (including the
-- commercial chains seeded earlier: Basic-Fit, Fitness Park, etc.) with
-- 'independante' — wrong for those. This corrects the known commercial
-- chains. (The app's "Importer les enseignes officielles" button now also
-- self-heals this going forward — see seedOfficialGyms.)
UPDATE public.gyms SET type = 'commerciale'
WHERE name IN (
  'Basic-Fit', 'Fitness Park', 'Neoness', 'Keepcool', 'On Air',
  'L''Orange Bleue', 'CMG Sports Club', 'Vita Liberté', 'Magic Form',
  'Aqualis Sporting Club', 'USC Fitness', 'Gymlib (réseau multi-salles)'
);
