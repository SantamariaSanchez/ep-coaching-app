-- Clés personnelles pour relier Claude (connecteur MCP) ou une
-- automatisation à l'appli (2026-09-30). Seule l'empreinte SHA-256 est
-- gardée, la clé n'est montrée qu'une fois.
create table if not exists public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Claude',
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists api_tokens_owner_idx on public.api_tokens (owner_id);
alter table public.api_tokens enable row level security;
drop policy if exists "own api tokens" on public.api_tokens;
create policy "own api tokens" on public.api_tokens for select using (owner_id = (select auth.uid()));
notify pgrst, 'reload schema';
