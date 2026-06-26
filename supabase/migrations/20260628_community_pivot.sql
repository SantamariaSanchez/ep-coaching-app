-- ═══════════════════════════════════════════════════════════
-- EP Coaching — Pivot communauté : onboarding + distinction
-- membres gratuits / clients payants
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists level text,
  add column if not exists source text;
