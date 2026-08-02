-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Onboarding client complet (repris de l'ancien formulaire
-- externe ep-coaching-formulaires.vercel.app, désormais intégré à l'appli)
-- Champs qui n'avaient pas encore de colonne dans client_intake.
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

alter table public.client_intake
  add column if not exists resting_heart_rate integer,
  add column if not exists cycle_length_days integer,
  add column if not exists hormonal_contraceptive text,
  add column if not exists known_nutrition_text text,
  add column if not exists gym_photo_paths text[] not null default '{}',
  add column if not exists physique_photo_paths text[] not null default '{}';
