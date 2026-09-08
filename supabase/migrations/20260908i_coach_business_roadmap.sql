-- Roadmap business personnelle du coach, sur 4 horizons (1/3/10/20 ans).
-- Demande directe 2026-09-08 : "la road map business plan sur 1 3 10 20 ans".
-- Deux tables : la vision (texte libre par horizon) et les jalons (liste
-- ouverte, l'utilisateur ajoute/coche/retire les siens, contrairement à
-- coach_business_checklist qui est une liste fixe définie dans le code).
--
-- Appliquée en prod le 2026-09-08 (migration cadmwvrsjklgtrrebflz
-- coach_business_roadmap), ce fichier rejoint le repo après coup.

create table if not exists public.coach_business_roadmap (
  coach_id uuid not null references public.profiles(id) on delete cascade,
  horizon text not null check (horizon in ('1_an', '3_ans', '10_ans', '20_ans')),
  vision text,
  updated_at timestamptz not null default now(),
  primary key (coach_id, horizon)
);

alter table public.coach_business_roadmap enable row level security;

drop policy if exists "Coach manages own business roadmap" on public.coach_business_roadmap;
create policy "Coach manages own business roadmap" on public.coach_business_roadmap
  for all using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));

create table if not exists public.coach_roadmap_milestones (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  horizon text not null check (horizon in ('1_an', '3_ans', '10_ans', '20_ans')),
  label text not null,
  done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists coach_roadmap_milestones_coach_horizon_idx
  on public.coach_roadmap_milestones (coach_id, horizon, position);

alter table public.coach_roadmap_milestones enable row level security;

drop policy if exists "Coach manages own roadmap milestones" on public.coach_roadmap_milestones;
create policy "Coach manages own roadmap milestones" on public.coach_roadmap_milestones
  for all using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
