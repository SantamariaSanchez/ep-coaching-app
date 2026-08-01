-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Expéditeur des notifications (prénom + badge de rôle)
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

alter table public.notifications add column if not exists sender_id uuid references public.profiles(id) on delete set null;
