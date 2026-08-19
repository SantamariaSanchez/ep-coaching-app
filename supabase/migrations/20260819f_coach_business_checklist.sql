-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Checklist business personnel du coach (Axe 6, VISION.md)
-- À EXÉCUTER MANUELLEMENT dans le Supabase SQL Editor (voir AGENTS.md).
-- ═══════════════════════════════════════════════════════════════════════
-- Demande directe 2026-08-19 : espace entrepreneuriat pour que chaque
-- coach construise SON business (pas juste le suivi de ses clients).
-- Items définis en dur dans lib/coach-business.ts (comme
-- lib/coach-specializations.ts) ; seul l'état coché/pas coché est
-- persisté ici, un coach par ligne (coach_id, item_key).

create table if not exists public.coach_business_checklist (
  coach_id uuid not null references public.profiles(id) on delete cascade,
  item_key text not null,
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (coach_id, item_key)
);

alter table public.coach_business_checklist enable row level security;

drop policy if exists "Coach manages own business checklist" on public.coach_business_checklist;
create policy "Coach manages own business checklist" on public.coach_business_checklist
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());
