-- ═══════════════════════════════════════════════════════════
-- EP Coaching — Recettes ajoutées par les membres
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

create table if not exists public.community_recipes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  meal text not null,
  diet text[] not null default '{}',
  phases text[] not null default '{}',
  season text[] not null default '{}',
  temp text not null,
  texture text[] not null default '{}',
  price smallint not null default 1,
  region text,
  prep_minutes integer not null default 15,
  kcal integer not null default 0,
  protein integer not null default 0,
  carbs integer not null default 0,
  fat integer not null default 0,
  allergens text[] not null default '{}',
  ingredients text[] not null default '{}',
  steps text[] not null default '{}',
  tip text,
  created_at timestamptz not null default now()
);

create index if not exists idx_community_recipes_created on public.community_recipes(created_at desc);

-- Same pattern as community_posts/resources: enable RLS with explicit
-- policies (not a bare disable) so a future "Enable RLS" click in the
-- Supabase dashboard can't silently re-lock the table with zero policies.
alter table public.community_recipes enable row level security;

drop policy if exists "Authenticated users can read recipes" on public.community_recipes;
create policy "Authenticated users can read recipes" on public.community_recipes
  for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can create their own recipes" on public.community_recipes;
create policy "Authenticated users can create their own recipes" on public.community_recipes
  for insert with check (auth.uid() = author_id);

drop policy if exists "Author or coach can delete a recipe" on public.community_recipes;
create policy "Author or coach can delete a recipe" on public.community_recipes
  for delete using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );
