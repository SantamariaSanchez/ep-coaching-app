-- ═══════════════════════════════════════════════════════════
-- EP Coaching — Tracking biométrique (sommeil, HRV, récupération...)
-- Préparation pour la connexion Oura Ring — saisie manuelle en attendant.
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

create table if not exists public.biometric_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  sleep_hours numeric,
  readiness_score smallint,
  hrv_ms smallint,
  resting_hr smallint,
  body_temp_deviation numeric,
  activity_calories integer,
  source text not null default 'manual' check (source in ('manual', 'oura')),
  created_at timestamptz not null default now(),
  unique (client_id, log_date)
);

create index if not exists idx_biometric_logs_client_date on public.biometric_logs(client_id, log_date desc);

create table if not exists public.biometric_insights (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  type text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  message text not null,
  suggestion text not null,
  acknowledged boolean not null default false,
  created_at timestamptz not null default now(),
  unique (client_id, log_date, type)
);

create index if not exists idx_biometric_insights_client on public.biometric_insights(client_id, created_at desc);

alter table public.biometric_logs enable row level security;
alter table public.biometric_insights enable row level security;

drop policy if exists "Owner or coach can read biometric logs" on public.biometric_logs;
create policy "Owner or coach can read biometric logs" on public.biometric_logs
  for select using (
    auth.uid() = client_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );
drop policy if exists "Owner can manage their biometric logs" on public.biometric_logs;
create policy "Owner can manage their biometric logs" on public.biometric_logs
  for all using (auth.uid() = client_id) with check (auth.uid() = client_id);

drop policy if exists "Owner or coach can read biometric insights" on public.biometric_insights;
create policy "Owner or coach can read biometric insights" on public.biometric_insights
  for select using (
    auth.uid() = client_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );
drop policy if exists "Owner can manage their biometric insights" on public.biometric_insights;
create policy "Owner can manage their biometric insights" on public.biometric_insights
  for all using (auth.uid() = client_id) with check (auth.uid() = client_id);
