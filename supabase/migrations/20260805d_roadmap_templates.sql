-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Modèles de Road Map (espace de conception coach)
-- Exécute dans le Supabase SQL Editor (jamais automatisé par Vercel)
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : même besoin que program_templates / diet_plan_templates
-- (20260804f_program_diet_templates.sql), appliqué à la Road Map client
-- (roadmaps / roadmap_phases / roadmap_objectives, voir 20260601_missing_
-- tables.sql). Un modèle de road map est une série de phases et de jalons
-- (objectifs) type pour un objectif donné (ex. "Prépa compétition 12
-- semaines"), détachée de tout client : pas de date fixe, un décalage en
-- semaines par rapport au démarrage. À l'application à un client, ces
-- décalages se convertissent en vraies dates à partir d'une date de
-- démarrage choisie par le coach (aujourd'hui par défaut).
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.roadmap_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  -- Phase de réflexion en amont du remplissage des phases/jalons : objectif
  -- du modèle et durée totale de conception, en semaines.
  objective text,
  duration_weeks integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roadmap_template_phases (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.roadmap_templates(id) on delete cascade,
  type text not null default 'maintenance',
  label text not null,
  -- Décalage en semaines par rapport à la date de démarrage du modèle
  -- (pas de date fixe, ça n'aurait aucun sens dans un modèle réutilisable).
  start_week_offset integer not null default 0,
  end_week_offset integer not null default 1,
  notes text,
  position integer not null default 0
);

create table if not exists public.roadmap_template_milestones (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.roadmap_templates(id) on delete cascade,
  type text not null default 'custom',
  term text not null default 'medium' check (term in ('short', 'medium', 'long')),
  label text not null,
  week_offset integer not null default 0,
  target_value numeric,
  target_unit text,
  description text,
  position integer not null default 0
);

create index if not exists roadmap_templates_coach_id_idx on public.roadmap_templates(coach_id);
create index if not exists roadmap_template_phases_template_id_idx on public.roadmap_template_phases(template_id);
create index if not exists roadmap_template_milestones_template_id_idx on public.roadmap_template_milestones(template_id);

-- ── RLS : un modèle appartient à un seul coach, jamais visible d'un autre
-- coach ni d'un client (garde fou en plus des Server Actions, qui vérifient
-- déjà requireCoach() + coach_id = auth.uid() sur chaque opération) ───────

alter table public.roadmap_templates enable row level security;
alter table public.roadmap_template_phases enable row level security;
alter table public.roadmap_template_milestones enable row level security;

drop policy if exists "Coach manages own roadmap templates" on public.roadmap_templates;
create policy "Coach manages own roadmap templates" on public.roadmap_templates
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

drop policy if exists "Coach manages own roadmap template phases" on public.roadmap_template_phases;
create policy "Coach manages own roadmap template phases" on public.roadmap_template_phases
  for all using (
    exists (select 1 from public.roadmap_templates t where t.id = template_id and t.coach_id = auth.uid())
  )
  with check (
    exists (select 1 from public.roadmap_templates t where t.id = template_id and t.coach_id = auth.uid())
  );

drop policy if exists "Coach manages own roadmap template milestones" on public.roadmap_template_milestones;
create policy "Coach manages own roadmap template milestones" on public.roadmap_template_milestones
  for all using (
    exists (select 1 from public.roadmap_templates t where t.id = template_id and t.coach_id = auth.uid())
  )
  with check (
    exists (select 1 from public.roadmap_templates t where t.id = template_id and t.coach_id = auth.uid())
  );
