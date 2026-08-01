-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Briques premium Lives : Audit, Suivi hebdo, Accès direct,
-- Ateliers experts
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- ── Nouveaux types de live ────────────────────────────────────────────────
alter table public.live_events drop constraint if exists live_events_type_check;
alter table public.live_events add constraint live_events_type_check
  check (type in ('1to1', 'webinaire', 'qna', 'audit', 'checkin_hebdo', 'acces_direct', 'atelier'));

-- Intervenant invité pour un atelier (spécialiste externe), le cas échéant.
alter table public.live_events add column if not exists guest_name text;

-- ── Accès direct : demandes de point flash (15 min, décision clé) ────────
-- Le client demande, le coach programme ou refuse — distinct d'un call
-- "Accès direct" mensuel classique, qui se programme comme n'importe quel
-- live_event (type='acces_direct').
create table if not exists public.live_flash_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'scheduled', 'declined')),
  live_event_id uuid references public.live_events(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_live_flash_requests_coach on public.live_flash_requests (coach_id, status);

alter table public.live_flash_requests enable row level security;

drop policy if exists "Participants manage flash requests" on public.live_flash_requests;
create policy "Participants manage flash requests" on public.live_flash_requests
  for all using (client_id = auth.uid() or coach_id = auth.uid())
  with check (client_id = auth.uid() or coach_id = auth.uid());
