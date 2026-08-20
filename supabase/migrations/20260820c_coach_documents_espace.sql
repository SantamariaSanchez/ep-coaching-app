-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Espace documents/productivité du coach (Axe 2, VISION.md)
-- Déjà exécutée manuellement en production via le MCP Supabase (table,
-- bucket privé et policies déjà créés — rien à copier/coller).
-- ═══════════════════════════════════════════════════════════════════════
-- Jamais cadré depuis le message d'origine du 2026-08-14 ("tout au même
-- endroit"). Cadré le 2026-08-20 (décision directe) en 3 volets :
-- 1. Modèles/contrats types — contenu statique, voir lib/coach-document-
--    templates.ts, pas de table (même logique que lib/medical-constraints.ts).
-- 2. Fichiers perso du coach — bucket privé + table ci-dessous.
-- 3. Notes/pense-bête perso — table ci-dessous.

-- ── Fichiers perso du coach ────────────────────────────────────────────
create table if not exists public.coach_personal_files (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  file_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists coach_personal_files_coach_id_idx
  on public.coach_personal_files(coach_id, created_at desc);

alter table public.coach_personal_files enable row level security;

drop policy if exists "Coach manages own personal files" on public.coach_personal_files;
create policy "Coach manages own personal files" on public.coach_personal_files
  for all using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

-- Bucket privé — accès uniquement via URL signée, jamais public (même
-- convention que progress-photos, 20260716_personal_photos.sql). Garde-fou
-- taille/type au niveau du bucket dès la création (même passe de sécurité
-- que 20260804g_security_hardening_pass2.sql, jamais laissé sans limite).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'coach-personal-files',
  'coach-personal-files',
  false,
  20971520, -- 20 Mo : documents perso, pas de vidéo lourde ici
  array[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "coach-personal-files owner read" on storage.objects;
create policy "coach-personal-files owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'coach-personal-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "coach-personal-files owner upload" on storage.objects;
create policy "coach-personal-files owner upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'coach-personal-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "coach-personal-files owner delete" on storage.objects;
create policy "coach-personal-files owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'coach-personal-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Notes/pense-bête perso ─────────────────────────────────────────────
-- Note et todo dans la même table : un item est un todo dès qu'on le
-- coche, sinon c'est juste une note en vrac — pas besoin de deux concepts
-- séparés pour un simple bloc-notes perso.
create table if not exists public.coach_personal_notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coach_personal_notes_coach_id_idx
  on public.coach_personal_notes(coach_id, created_at desc);

alter table public.coach_personal_notes enable row level security;

drop policy if exists "Coach manages own personal notes" on public.coach_personal_notes;
create policy "Coach manages own personal notes" on public.coach_personal_notes
  for all using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));
