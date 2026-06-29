-- ═══════════════════════════════════════════════════════════
-- EP Coaching — Tour d'onboarding pour les nouveaux inscrits
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

-- Grandfather in every profile that already exists — only NEW signups
-- after this point should see the onboarding tour.
update public.profiles
set onboarding_completed_at = now()
where onboarding_completed_at is null;
