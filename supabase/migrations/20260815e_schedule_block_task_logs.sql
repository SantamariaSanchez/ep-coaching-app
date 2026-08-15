-- Suivi de completion des tâches d'un bloc d'agenda, par jour — demande
-- explicite du 2026-08-15 : "des chose a cocher... pas juste une notif".
-- Les tâches elles-mêmes vivent dans schedule_blocks.tasks (text[] libre,
-- pas d'id individuel), donc chaque tâche cochée est identifiée par une
-- clé synthétique "{block_id}:{task_index}" plutôt qu'une FK — même
-- principe que step_logs.completed_items (tableau de clés complété par
-- jour), pas une ligne par tâche.
create table public.schedule_block_task_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  completed_keys text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, log_date)
);

alter table public.schedule_block_task_logs enable row level security;

-- Même politique unique (lecture + écriture) que schedule_blocks lui-même
-- (sa table parente) : le propriétaire ou son coach.
create policy "Owner or coach manage schedule block task logs"
on public.schedule_block_task_logs
for all
using (owner_id = (select auth.uid()) or is_own_coach(owner_id))
with check (owner_id = (select auth.uid()) or is_own_coach(owner_id));

create index schedule_block_task_logs_owner_date_idx
on public.schedule_block_task_logs (owner_id, log_date);
