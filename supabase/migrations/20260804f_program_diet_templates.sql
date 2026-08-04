-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Modèles de programme et de diète (espace de conception coach)
-- Exécute dans le Supabase SQL Editor (jamais automatisé par Vercel)
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : jusqu'ici, un programme d'entraînement (programs/program_days/
-- exercises) et une diète (diet_plans/diet_plan_meals) sont toujours créés
-- directement pour UN client précis, from scratch, sans possibilité de
-- réutiliser une structure déjà pensée pour un autre client (ex. "Push Pull
-- Legs 5x/semaine", "Prépa compétition physique"). Chaque nouveau client
-- coaché = tout retaper à zéro.
--
-- Ces tables introduisent des modèles réutilisables, propriété d'un coach
-- (jamais partagés entre coachs, même cloisonnement que le reste du modèle
-- multi-coach), détachés de tout client. Un modèle s'applique ensuite à un
-- ou plusieurs clients pour générer un programme/une diète bien à eux
-- (copie indépendante, éditable ensuite sans jamais modifier le modèle).
-- ═══════════════════════════════════════════════════════════════════════

-- ── Modèles de programme ─────────────────────────────────────────────────

create table if not exists public.program_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type text,
  frequency integer,
  -- Phase de réflexion en amont du remplissage des exercices : objectif
  -- du modèle (ex. "Hypertrophie, débutant", "Prépa compétition physique")
  -- et notes de conception privées au coach, jamais montrées à un client.
  objective text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.program_template_days (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.program_templates(id) on delete cascade,
  day_label text not null,
  position integer not null default 0
);

create table if not exists public.program_template_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.program_template_days(id) on delete cascade,
  name text not null,
  sets integer,
  reps text,
  rir integer,
  rest_seconds integer,
  notes text,
  position integer not null default 0,
  muscle_group text,
  muscle_subgroup text,
  is_direct boolean not null default true
);

create index if not exists program_templates_coach_id_idx on public.program_templates(coach_id);
create index if not exists program_template_days_template_id_idx on public.program_template_days(template_id);
create index if not exists program_template_exercises_day_id_idx on public.program_template_exercises(day_id);

-- ── Modèles de diète ──────────────────────────────────────────────────────

create table if not exists public.diet_plan_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  mode text not null check (mode in ('flexible', 'fixed', 'fixed_flexible')),
  structure text not null default 'daily' check (structure in ('daily', 'weekly')),
  objective text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.diet_plan_template_meals (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.diet_plan_templates(id) on delete cascade,
  meal_slot text not null,
  food_id uuid not null references public.foods(id) on delete cascade,
  quantity_g numeric not null,
  position integer not null default 0,
  day_of_week text
);

create index if not exists diet_plan_templates_coach_id_idx on public.diet_plan_templates(coach_id);
create index if not exists diet_plan_template_meals_template_id_idx on public.diet_plan_template_meals(template_id);

-- ── RLS : un modèle appartient à un seul coach, jamais visible d'un autre
-- coach ni d'un client (garde fou en plus des Server Actions, qui vérifient
-- déjà requireCoach() + coach_id = auth.uid() sur chaque opération) ───────

alter table public.program_templates enable row level security;
alter table public.program_template_days enable row level security;
alter table public.program_template_exercises enable row level security;
alter table public.diet_plan_templates enable row level security;
alter table public.diet_plan_template_meals enable row level security;

drop policy if exists "Coach manages own program templates" on public.program_templates;
create policy "Coach manages own program templates" on public.program_templates
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

drop policy if exists "Coach manages own program template days" on public.program_template_days;
create policy "Coach manages own program template days" on public.program_template_days
  for all using (
    exists (select 1 from public.program_templates t where t.id = template_id and t.coach_id = auth.uid())
  )
  with check (
    exists (select 1 from public.program_templates t where t.id = template_id and t.coach_id = auth.uid())
  );

drop policy if exists "Coach manages own program template exercises" on public.program_template_exercises;
create policy "Coach manages own program template exercises" on public.program_template_exercises
  for all using (
    exists (
      select 1 from public.program_template_days d
      join public.program_templates t on t.id = d.template_id
      where d.id = day_id and t.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.program_template_days d
      join public.program_templates t on t.id = d.template_id
      where d.id = day_id and t.coach_id = auth.uid()
    )
  );

drop policy if exists "Coach manages own diet plan templates" on public.diet_plan_templates;
create policy "Coach manages own diet plan templates" on public.diet_plan_templates
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

drop policy if exists "Coach manages own diet plan template meals" on public.diet_plan_template_meals;
create policy "Coach manages own diet plan template meals" on public.diet_plan_template_meals
  for all using (
    exists (select 1 from public.diet_plan_templates t where t.id = template_id and t.coach_id = auth.uid())
  )
  with check (
    exists (select 1 from public.diet_plan_templates t where t.id = template_id and t.coach_id = auth.uid())
  );
