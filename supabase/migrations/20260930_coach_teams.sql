-- Équipes de coachs (demande directe 2026-09-29 : "un coach peut travailler
-- à son compte, pour une marque comme EP Coaching, avec un autre coach, ou
-- avoir une entreprise et recruter"). Un responsable (owner_id) invite des
-- coachs par email ; le coach accepte depuis sa page Mon équipe. Le staff
-- non coach (setter, closer, monteur...) reste dans staff_members.
-- Écritures : uniquement via le serveur (service role), après vérification.
-- Idempotent : peut être relancée sans risque.

create table if not exists public.coach_team_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete cascade,
  email text not null,
  title text,
  -- Part du chiffre d'affaires reversée au coach, en % (info de gestion).
  share_pct numeric check (share_pct is null or (share_pct >= 0 and share_pct <= 100)),
  status text not null default 'invite' check (status in ('invite', 'actif', 'refuse', 'termine')),
  note text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  unique (owner_id, email)
);
create index if not exists coach_team_links_owner_idx on public.coach_team_links (owner_id, status);
create index if not exists coach_team_links_coach_idx on public.coach_team_links (coach_id, status);
create index if not exists coach_team_links_email_idx on public.coach_team_links (lower(email)) where status = 'invite';

alter table public.coach_team_links enable row level security;
drop policy if exists "coach_team_owner_read" on public.coach_team_links;
create policy "coach_team_owner_read" on public.coach_team_links
  for select using (owner_id = (select auth.uid()));
drop policy if exists "coach_team_member_read" on public.coach_team_links;
create policy "coach_team_member_read" on public.coach_team_links
  for select using (coach_id = (select auth.uid()));

notify pgrst, 'reload schema';
