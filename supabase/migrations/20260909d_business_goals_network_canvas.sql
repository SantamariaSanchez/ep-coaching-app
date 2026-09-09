-- Extension de l'espace "Développer mon business" (Axe 6) : demande directe
-- 2026-09-09, "pas juste un petit onglet avec des cases à cocher mais une
-- incroyable architecture de choses utiles pour dev son business... plein
-- plein de fonctionnalités optimisées". Trois nouvelles briques, même
-- pattern RLS que coach_business_checklist/coach_business_roadmap déjà en
-- place (coach_id = auth.uid(), coach propriétaire de ses propres données).

-- ── Objectifs business (SMART goals) ──────────────────────────────────────
-- Deux familles de métrique : 'clients_actifs' et 'revenu_mois' se calculent
-- EN DIRECT depuis des données déjà réelles dans l'appli (jamais une valeur
-- déclarée à la main qui pourrait dériver du réel), 'custom' est un
-- objectif que le coach chiffre et met à jour lui-même (ex. "abonnés
-- Instagram").
create table if not exists public.coach_business_goals (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  metric_type text not null default 'custom' check (metric_type in ('clients_actifs', 'revenu_mois', 'custom')),
  unit text, -- utilisé seulement si metric_type = 'custom' (ex. "abonnés", "clients")
  target_value numeric not null check (target_value > 0),
  manual_current_value numeric not null default 0, -- utilisé seulement si metric_type = 'custom'
  target_date date,
  status text not null default 'active' check (status in ('active', 'done', 'abandoned')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists coach_business_goals_coach_idx
  on public.coach_business_goals (coach_id, status);

alter table public.coach_business_goals enable row level security;

drop policy if exists "Coach manages own business goals" on public.coach_business_goals;
create policy "Coach manages own business goals" on public.coach_business_goals
  for all using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));

-- ── Réseau & partenariats (CRM léger, distinct des leads plateforme) ─────
create table if not exists public.coach_network_contacts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text not null default 'autre' check (category in ('partenaire', 'affilie', 'influenceur', 'fournisseur', 'autre')),
  contact_info text,
  status text not null default 'a_contacter' check (status in ('a_contacter', 'en_discussion', 'actif', 'inactif')),
  note text,
  last_contact_date date,
  created_at timestamptz not null default now()
);

create index if not exists coach_network_contacts_coach_idx
  on public.coach_network_contacts (coach_id, status);

alter table public.coach_network_contacts enable row level security;

drop policy if exists "Coach manages own network contacts" on public.coach_network_contacts;
create policy "Coach manages own network contacts" on public.coach_network_contacts
  for all using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));

-- ── Modèle économique (Business Model Canvas, 9 blocs classiques) ────────
create table if not exists public.coach_business_canvas (
  coach_id uuid primary key references public.profiles(id) on delete cascade,
  value_proposition text,
  customer_segments text,
  channels text,
  customer_relationships text,
  revenue_streams text,
  key_resources text,
  key_activities text,
  key_partners text,
  cost_structure text,
  updated_at timestamptz not null default now()
);

alter table public.coach_business_canvas enable row level security;

drop policy if exists "Coach manages own business canvas" on public.coach_business_canvas;
create policy "Coach manages own business canvas" on public.coach_business_canvas
  for all using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
