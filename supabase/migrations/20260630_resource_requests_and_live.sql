-- ═══════════════════════════════════════════════════════════
-- EP Coaching — Demandes de guides (Ressources) + Lives / appels vidéo
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── 1. DEMANDES DE GUIDES ────────────────────────────────────
-- Les membres suggèrent un sujet de guide, le coach répond et livre.

create table if not exists public.resource_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  status text not null default 'open' check (status in ('open', 'answered')),
  coach_response text,
  resource_id uuid references public.resources(id) on delete set null,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

create index if not exists idx_resource_requests_created on public.resource_requests(created_at desc);

alter table public.resource_requests enable row level security;

drop policy if exists "Authenticated users can read requests" on public.resource_requests;
create policy "Authenticated users can read requests" on public.resource_requests
  for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can create their own requests" on public.resource_requests;
create policy "Authenticated users can create their own requests" on public.resource_requests
  for insert with check (auth.uid() = author_id);

drop policy if exists "Author or coach can update a request" on public.resource_requests;
create policy "Author or coach can update a request" on public.resource_requests
  for update using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );

drop policy if exists "Author or coach can delete a request" on public.resource_requests;
create policy "Author or coach can delete a request" on public.resource_requests
  for delete using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );

-- ── 2. LIVES / APPELS VIDÉO ───────────────────────────────────
-- Le coach planifie des sessions live (1:1, webinaire, Q&A) avec une salle
-- vidéo intégrée (Jitsi Meet, serveur public gratuit — pas de clé API requise).

create table if not exists public.live_events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  type text not null check (type in ('1to1', 'webinaire', 'qna')),
  invited_client_id uuid references auth.users(id) on delete set null,
  room_slug text not null unique,
  starts_at timestamptz not null,
  duration_minutes integer not null default 30,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'ended')),
  created_at timestamptz not null default now()
);

create index if not exists idx_live_events_starts on public.live_events(starts_at);

alter table public.live_events enable row level security;

drop policy if exists "Authenticated users can read live events" on public.live_events;
create policy "Authenticated users can read live events" on public.live_events
  for select using (auth.role() = 'authenticated');

drop policy if exists "Coach can create live events" on public.live_events;
create policy "Coach can create live events" on public.live_events
  for insert with check (
    auth.uid() = host_id
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );

drop policy if exists "Coach can update their live events" on public.live_events;
create policy "Coach can update their live events" on public.live_events
  for update using (auth.uid() = host_id);

drop policy if exists "Coach can delete their live events" on public.live_events;
create policy "Coach can delete their live events" on public.live_events
  for delete using (auth.uid() = host_id);
