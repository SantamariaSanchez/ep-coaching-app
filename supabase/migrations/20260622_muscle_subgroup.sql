-- ═══════════════════════════════════════════════════════════
-- EP Coaching — Sous-groupe musculaire (chef musculaire) par exercice
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

alter table public.exercises
  add column if not exists muscle_subgroup text;
