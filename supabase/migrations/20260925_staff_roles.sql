-- Espaces métier pour les 18 postes recrutés de l'organigramme (tous sauf
-- "Coach sportif & nutrition", qui a déjà son propre espace coach). Voir
-- lib/staff-roles.ts pour la configuration de chaque métier et
-- app/equipe/* pour l'espace lui même.
--
-- Principe de sécurité : profiles.role = 'staff' ne donne AUCUN accès à lui
-- seul. L'accès réel à l'espace équipe exige une ligne dans staff_members,
-- que seule la service_role peut écrire (aucune policy insert/update/delete
-- ci dessous). profiles.role reste de toute façon protégé par le trigger
-- protect_profile_privileged_columns.

-- ── 1. Valeur 'staff' autorisée pour profiles.role ──────────────────────
-- La contrainte d'origine sur role n'est pas dans ce repo (table créée
-- depuis le dashboard Supabase) : on gère les deux cas possibles, enum ou
-- texte avec CHECK, sans deviner son nom.
do $$
declare
  col_type text;
  col_udt text;
  c record;
begin
  select data_type, udt_name into col_type, col_udt
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name = 'role';

  if col_type = 'USER-DEFINED' then
    execute format('alter type public.%I add value if not exists %L', col_udt, 'staff');
  else
    for c in
      select conname from pg_constraint
      where conrelid = 'public.profiles'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ~* '\mrole\M'
    loop
      execute format('alter table public.profiles drop constraint %I', c.conname);
    end loop;
    alter table public.profiles
      add constraint profiles_role_check check (role in ('coach', 'client', 'staff')) not valid;
  end if;
end $$;

-- ── 2. Membres de l'équipe ──────────────────────────────────────────────
create table if not exists public.staff_members (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null,
  full_name text not null,
  email text not null,
  status text not null default 'actif' check (status in ('actif', 'suspendu', 'termine')),
  application_id uuid references public.job_applications(id) on delete set null,
  terms_accepted_at timestamptz,
  terms_version text,
  contract_version text,
  contract_signed_at timestamptz,
  contract_signature text check (contract_signature is null or char_length(contract_signature) <= 200),
  contract_signed_ip text,
  created_at timestamptz not null default now()
);

create index if not exists staff_members_owner_idx on public.staff_members (owner_id, role_key);

alter table public.staff_members enable row level security;

create policy "staff_members_self_read" on public.staff_members
  for select using (user_id = (select auth.uid()));

create policy "staff_members_owner_read" on public.staff_members
  for select using (owner_id = (select auth.uid()));

-- ── 3. Emails autorisés à créer un accès, par métier ────────────────────
-- Une candidature passée en "acceptée" crée automatiquement son invitation
-- (voir app/dashboard/coach/admin/organisation/actions.ts). Le fondateur
-- peut aussi autoriser un email à la main depuis Organisation.
create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null,
  email text not null check (email = lower(email) and char_length(email) <= 300),
  application_id uuid references public.job_applications(id) on delete set null,
  used_at timestamptz,
  used_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (role_key, email)
);

alter table public.staff_invites enable row level security;

create policy "staff_invites_owner_read" on public.staff_invites
  for select using (owner_id = (select auth.uid()));

-- ── 4. Données métier (CRM, agenda, tâches, livrables, rapports...) ─────
-- Une seule table générique typée par `kind` plutôt qu'une table par
-- métier : les 18 espaces partagent les mêmes briques (voir
-- lib/staff-roles.ts), seul le paramétrage change. Les colonnes dédiées
-- (title, status, amount, occurred_on, due_at) portent ce qui sert au tri
-- et aux indicateurs, le reste vit dans data.
create table if not exists public.staff_records (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in (
    'lead', 'appointment', 'task', 'deliverable', 'campaign', 'ticket', 'feature',
    'transaction', 'candidate', 'audit', 'followup', 'opportunity', 'process', 'report'
  )),
  title text not null check (char_length(title) between 1 and 300),
  status text not null check (char_length(status) <= 40),
  amount numeric(12, 2) check (amount is null or (amount >= -10000000 and amount <= 10000000)),
  occurred_on date,
  due_at timestamptz,
  data jsonb not null default '{}'::jsonb check (octet_length(data::text) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_records_staff_kind_idx on public.staff_records (staff_id, kind, created_at desc);
create index if not exists staff_records_staff_due_idx on public.staff_records (staff_id, due_at);
-- Un seul rapport de fin de journée par personne et par jour.
create unique index if not exists staff_records_one_report_per_day
  on public.staff_records (staff_id, occurred_on) where kind = 'report';

alter table public.staff_records enable row level security;

-- Chaque membre actif gère uniquement ses propres données.
create policy "staff_records_own" on public.staff_records
  for all
  using (
    staff_id = (select auth.uid())
    and exists (
      select 1 from public.staff_members m
      where m.user_id = (select auth.uid()) and m.status = 'actif'
    )
  )
  with check (
    staff_id = (select auth.uid())
    and exists (
      select 1 from public.staff_members m
      where m.user_id = (select auth.uid()) and m.status = 'actif'
    )
  );

-- Le fondateur lit tout ce que fait son équipe.
create policy "staff_records_owner_read" on public.staff_records
  for select using (
    exists (
      select 1 from public.staff_members m
      where m.user_id = staff_records.staff_id and m.owner_id = (select auth.uid())
    )
  );

-- ── 5. CV PDF sur les candidatures ──────────────────────────────────────
alter table public.job_applications add column if not exists cv_path text;

-- Bucket privé : aucune policy publique, l'écriture passe par le client
-- admin dans app/carrieres/actions.ts, la lecture par URL signée côté
-- serveur (Organisation, espace RH).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-cvs', 'job-cvs', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
