-- Données "Forme du jour" du bilan (demande directe 2026-09-29 : "explore
-- tout, de la moindre donnée"). Toutes optionnelles, activées une par une
-- dans Mon appli (désactivées par défaut).
alter table public.daily_logs add column if not exists energy smallint check (energy is null or energy between 1 and 5);
alter table public.daily_logs add column if not exists mood smallint check (mood is null or mood between 1 and 5);
alter table public.daily_logs add column if not exists soreness smallint check (soreness is null or soreness between 1 and 5);
alter table public.daily_logs add column if not exists water_l numeric check (water_l is null or (water_l >= 0 and water_l <= 15));
alter table public.daily_logs add column if not exists resting_hr smallint check (resting_hr is null or resting_hr between 25 and 220);
alter table public.daily_logs add column if not exists hrv smallint check (hrv is null or hrv between 5 and 300);
notify pgrst, 'reload schema';
