-- ═══════════════════════════════════════════════════════════
-- EP Coaching — Tracker de pas (objectif, routine, logs quotidiens)
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

create table if not exists public.step_settings (
  client_id uuid primary key references auth.users(id) on delete cascade,
  daily_goal integer not null default 8000,
  updated_at timestamptz not null default now()
);

create table if not exists public.step_routine_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  time_label text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_step_routine_items_client on public.step_routine_items(client_id, position);

create table if not exists public.step_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  steps_actual integer not null default 0,
  completed_items text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (client_id, log_date)
);

create index if not exists idx_step_logs_client_date on public.step_logs(client_id, log_date desc);

-- RLS : chacun gère ses propres données, le coach peut tout consulter
-- (mais pas modifier — c'est le client/membre qui s'auto-ajuste).

alter table public.step_settings enable row level security;
alter table public.step_routine_items enable row level security;
alter table public.step_logs enable row level security;

drop policy if exists "Owner or coach can read step settings" on public.step_settings;
create policy "Owner or coach can read step settings" on public.step_settings
  for select using (
    auth.uid() = client_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );
drop policy if exists "Owner can manage their step settings" on public.step_settings;
create policy "Owner can manage their step settings" on public.step_settings
  for all using (auth.uid() = client_id) with check (auth.uid() = client_id);

drop policy if exists "Owner or coach can read routine items" on public.step_routine_items;
create policy "Owner or coach can read routine items" on public.step_routine_items
  for select using (
    auth.uid() = client_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );
drop policy if exists "Owner can manage their routine items" on public.step_routine_items;
create policy "Owner can manage their routine items" on public.step_routine_items
  for all using (auth.uid() = client_id) with check (auth.uid() = client_id);

drop policy if exists "Owner or coach can read step logs" on public.step_logs;
create policy "Owner or coach can read step logs" on public.step_logs
  for select using (
    auth.uid() = client_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );
drop policy if exists "Owner can manage their step logs" on public.step_logs;
create policy "Owner can manage their step logs" on public.step_logs
  for all using (auth.uid() = client_id) with check (auth.uid() = client_id);
