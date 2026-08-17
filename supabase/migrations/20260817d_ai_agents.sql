-- Support des 19 agents IA dans l'appli (demande explicite 2026-08-17 :
-- "mets moi vraiment ces agents IA dans l'appli que je puisse discuter
-- avec eux directement"). Les agents eux-mêmes (nom, mission, prompt
-- système) sont des données statiques (lib/ai-agents.ts, pas de table) :
-- seuls l'historique de chat et les tâches assignées ont besoin d'être
-- persistés.

create table if not exists public.ai_agent_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  agent_key text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_agent_messages_owner_agent_idx
  on public.ai_agent_messages(owner_id, agent_key, created_at);

alter table public.ai_agent_messages enable row level security;

create policy "ai_agent_messages_owner_all" on public.ai_agent_messages
  for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create table if not exists public.ai_agent_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  agent_key text not null,
  title text not null,
  description text,
  status text not null default 'a_faire' check (status in ('a_faire', 'en_cours', 'fait')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_agent_tasks_owner_agent_idx
  on public.ai_agent_tasks(owner_id, agent_key, status);

alter table public.ai_agent_tasks enable row level security;

create policy "ai_agent_tasks_owner_all" on public.ai_agent_tasks
  for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
