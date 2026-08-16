-- Candidatures reçues depuis la page publique /carrieres (demande explicite
-- 2026-08-16 : recrutement réel et proche sur les 19 postes de
-- l'organigramme, "ouvrir aux candidatures externes"). Un candidat n'a
-- jamais de session au moment où il postule, donc pas de policy insert
-- ici : l'écriture passe uniquement par le client admin dans
-- app/carrieres/actions.ts (submitApplication), même principe que
-- submitLead() dans app/ressources/actions.ts.
--
-- owner_id plutôt qu'un flag global : même convention que org_role_status
-- (une seule plateforme aujourd'hui, mais la RLS reste bornée par
-- utilisateur comme partout ailleurs, pas seulement par le garde
-- applicatif requirePlatformOwner()).

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null,
  full_name text not null,
  email text not null,
  phone text,
  status text not null default 'nouvelle' check (status in ('nouvelle', 'en_discussion', 'refusee', 'acceptee')),
  created_at timestamptz not null default now()
);

create index if not exists job_applications_owner_idx on public.job_applications (owner_id, created_at desc);

alter table public.job_applications enable row level security;

create policy "job_applications_owner_read" on public.job_applications
  for select
  using (owner_id = (select auth.uid()));

create policy "job_applications_owner_update" on public.job_applications
  for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
