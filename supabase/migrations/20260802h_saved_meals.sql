-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Repas enregistrés (log nutrition en 1 clic) + popularité
-- globale des aliments (pour "les plus utilisés par les autres").
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_meal_items (
  id uuid primary key default gen_random_uuid(),
  saved_meal_id uuid not null references public.saved_meals(id) on delete cascade,
  food_id uuid not null references public.foods(id) on delete cascade,
  quantity_g numeric not null
);

create index if not exists idx_saved_meals_owner on public.saved_meals (owner_id);
create index if not exists idx_saved_meal_items_meal on public.saved_meal_items (saved_meal_id);

alter table public.saved_meals enable row level security;
alter table public.saved_meal_items enable row level security;

drop policy if exists "Users manage own saved meals" on public.saved_meals;
create policy "Users manage own saved meals" on public.saved_meals
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "Users manage own saved meal items" on public.saved_meal_items;
create policy "Users manage own saved meal items" on public.saved_meal_items
  for all using (
    exists (select 1 from public.saved_meals sm where sm.id = saved_meal_id and sm.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.saved_meals sm where sm.id = saved_meal_id and sm.owner_id = auth.uid())
  );

-- Popularité globale d'un aliment (nombre de fois loggé, tous utilisateurs
-- confondus) — utilisée pour suggérer "les plus utilisés" en plus de
-- l'historique personnel. Vue simple plutôt qu'une requête agrégée côté
-- app (PostgREST ne fait pas de GROUP BY).
create or replace view public.food_log_popularity as
select food_id, count(*) as log_count
from public.food_logs
where food_id is not null
group by food_id;
