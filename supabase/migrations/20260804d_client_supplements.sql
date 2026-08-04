-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Suivi des compléments alimentaires
-- ═══════════════════════════════════════════════════════════════════════
-- Nouvelle table : liste des compléments d'un client (nom, dosage, moment
-- de prise). Le client gère sa propre liste, son coach peut la consulter
-- et y ajouter une suggestion (suggested_by renseigné).
-- ═══════════════════════════════════════════════════════════════════════

-- Référence public.profiles(id) plutôt que auth.users(id) pour permettre
-- l'embed PostgREST (select "*, coach:suggested_by(full_name)") — même
-- convention que check_ins.client_id.
create table if not exists public.client_supplements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  dosage text,
  timing text,
  notes text,
  suggested_by uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'stopped')),
  created_at timestamptz not null default now()
);

create index if not exists client_supplements_client_id_idx on public.client_supplements(client_id);

alter table public.client_supplements enable row level security;

drop policy if exists "Client manages own supplements" on public.client_supplements;
create policy "Client manages own supplements" on public.client_supplements
  for all using (client_id = auth.uid())
  with check (client_id = auth.uid());

drop policy if exists "Coach manages own client supplements" on public.client_supplements;
create policy "Coach manages own client supplements" on public.client_supplements
  for all using (public.is_own_coach(client_id))
  with check (public.is_own_coach(client_id));
