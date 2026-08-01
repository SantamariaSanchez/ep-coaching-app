-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Fondations Lives : RSVP, disponibilités 1:1, rappel J-1,
-- notes post-live
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- ── Notes post-live (compense l'absence de rediff) ──────────────────────
alter table public.live_events add column if not exists recap text;

-- ── Rappel J-1, distinct du rappel "dans quelques minutes" déjà en place ─
alter table public.live_events add column if not exists reminder_24h_sent_at timestamptz;

-- ── RSVP sur les lives de groupe (webinaire/qna) ─────────────────────────
create table if not exists public.live_event_rsvps (
  event_id uuid not null references public.live_events(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, client_id)
);

alter table public.live_event_rsvps enable row level security;

drop policy if exists "Client manages own rsvp" on public.live_event_rsvps;
create policy "Client manages own rsvp" on public.live_event_rsvps
  for all using (
    client_id = auth.uid()
    or exists (
      select 1 from public.live_events e
      where e.id = event_id and e.host_id = auth.uid()
    )
  )
  with check (client_id = auth.uid());

-- ── Disponibilités 1:1 en libre-service ──────────────────────────────────
-- Un coach définit un ou plusieurs créneaux récurrents hebdomadaires ; le
-- client réserve directement un live_event de type 1to1 dans un créneau
-- libre, sans que le coach ait à le programmer lui-même.
create table if not exists public.coach_availability (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 7), -- 1=lundi ... 7=dimanche
  start_time time not null,
  end_time time not null,
  slot_duration_minutes int not null default 30,
  created_at timestamptz not null default now()
);

create index if not exists idx_coach_availability_coach on public.coach_availability (coach_id);

alter table public.coach_availability enable row level security;

drop policy if exists "Coach manages own availability" on public.coach_availability;
create policy "Coach manages own availability" on public.coach_availability
  for all using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Helper : l'inverse de is_own_coach — le viewer est-il client de ce coach ?
create or replace function public.is_own_coach_of_viewer(target_coach_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and coach_id = target_coach_id
  )
$$;

-- Les clients d'un coach doivent pouvoir lire ses disponibilités pour
-- réserver un créneau.
drop policy if exists "Own clients read availability" on public.coach_availability;
create policy "Own clients read availability" on public.coach_availability
  for select using (
    coach_id = auth.uid() or public.is_own_coach_of_viewer(coach_id)
  );

-- ── Planifie le rappel J-1 (toutes les heures) ───────────────────────────
-- IMPORTANT : remplace REPLACE_WITH_CRON_SECRET par la vraie valeur de
-- CRON_SECRET (Vercel) avant d'exécuter cette migration.
select cron.unschedule('live-reminders-24h')
where exists (select 1 from cron.job where jobname = 'live-reminders-24h');

select cron.schedule(
  'live-reminders-24h',
  '0 * * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/live-reminders-24h',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
