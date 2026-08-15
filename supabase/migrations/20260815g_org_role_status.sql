-- Suivi de statut de recrutement par poste, page Administration > Organisation
-- (demande explicite 2026-08-15 : "des vrai truc ou cliquer... vrai
-- fonctionnaliter utile pas juste du texte"). Les postes eux-mêmes restent
-- codés en dur dans app/dashboard/coach/admin/organisation/page.tsx (POLES) —
-- ce n'est pas un référentiel RH complet, seulement une case à cocher par
-- poste pour transformer la page de référence statique en outil de suivi
-- réel. role_key = identifiant stable défini côté code (ex "sales-setter"),
-- jamais dérivé d'un titre affiché qui peut changer.

create table if not exists public.org_role_status (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null,
  status text not null default 'a_pourvoir' check (status in ('a_pourvoir', 'en_recrutement', 'pourvu')),
  updated_at timestamptz not null default now(),
  primary key (owner_id, role_key)
);

alter table public.org_role_status enable row level security;

-- Réservé au propriétaire de la plateforme comme le reste de la page (même
-- garde que requirePlatformOwner() côté serveur), mais la RLS reste bornée
-- par owner_id comme partout ailleurs plutôt que de dépendre uniquement du
-- guard applicatif.
create policy "org_role_status_own" on public.org_role_status
  for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
