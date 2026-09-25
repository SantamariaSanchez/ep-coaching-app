-- Appli complète par métier pour l'équipe (demande directe 2026-09-25 :
-- formation, espace de travail, modèles, documents, fiche technique,
-- messagerie d'équipe, tâches assignées par le fondateur). Voir
-- lib/staff-team.ts, lib/staff-training.ts, lib/staff-templates.ts.
-- Ré-exécutable sans erreur.

-- ── 1. Nouveaux types d'éléments : modèles perso et notes de travail ────
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.staff_records'::regclass and contype = 'c' and pg_get_constraintdef(oid) ~* '\mkind\M'
  loop
    execute format('alter table public.staff_records drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.staff_records add constraint staff_records_kind_check check (kind in (
  'lead', 'appointment', 'task', 'deliverable', 'campaign', 'ticket', 'feature',
  'transaction', 'candidate', 'audit', 'followup', 'opportunity', 'process', 'report',
  'template', 'note'
));

-- ── 2. Progression de la formation ──────────────────────────────────────
create table if not exists public.staff_training_progress (
  staff_id uuid not null references public.profiles(id) on delete cascade,
  lesson_key text not null check (char_length(lesson_key) <= 120),
  completed_at timestamptz not null default now(),
  primary key (staff_id, lesson_key)
);

alter table public.staff_training_progress enable row level security;

drop policy if exists "staff_training_own" on public.staff_training_progress;
create policy "staff_training_own" on public.staff_training_progress
  for select using (staff_id = (select auth.uid()));

-- ── 3. Documents (partagés par le fondateur ou déposés par la recrue) ───
-- staff_id null = partagé avec toute l'équipe (ou tout un métier si
-- role_key est renseigné). Écriture et lecture passent par le serveur
-- (lib/staff-team.ts), qui applique ces règles de visibilité.
create table if not exists public.staff_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  staff_id uuid references public.profiles(id) on delete cascade,
  role_key text,
  title text not null check (char_length(title) between 1 and 200),
  url text check (url is null or char_length(url) <= 2000),
  storage_path text,
  note text check (note is null or char_length(note) <= 2000),
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists staff_documents_owner_idx on public.staff_documents (owner_id, created_at desc);
alter table public.staff_documents enable row level security;

-- ── 4. Messagerie d'équipe ──────────────────────────────────────────────
-- Messages privés (recipient_id) ou canal d'équipe (channel = 'general').
create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade,
  channel text check (channel is null or channel in ('general')),
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check ((recipient_id is null) <> (channel is null))
);

create index if not exists team_messages_pair_idx on public.team_messages (owner_id, sender_id, recipient_id, created_at desc);
create index if not exists team_messages_recipient_idx on public.team_messages (recipient_id, read_at);
create index if not exists team_messages_channel_idx on public.team_messages (owner_id, channel, created_at desc) where channel is not null;
alter table public.team_messages enable row level security;

-- ── 5. Stockage privé des documents d'équipe ────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('staff-docs', 'staff-docs', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;
