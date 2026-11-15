-- Retour volontaire des membres sur l'appli (chantier C78, 2026-11-15).
-- Trois questions courtes : utilité (1 à 5), ce qui sert le plus, ce qui
-- manque ou bloque. Jamais de donnée de santé demandée ; aucune donnée
-- sportive ou nutritionnelle n'est copiée ici. Lecture réservée à la
-- personne elle-même et au propriétaire de la plateforme.

create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  access_type text check (access_type is null or char_length(access_type) <= 40),
  usefulness smallint not null check (usefulness between 1 and 5),
  most_useful text check (most_useful is null or most_useful in ('programme', 'seance', 'nutrition', 'suivi', 'guides', 'rien_encore')),
  missing text check (missing is null or char_length(missing) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists app_feedback_user_created_idx on public.app_feedback (user_id, created_at desc);
create index if not exists app_feedback_created_idx on public.app_feedback (created_at desc);

alter table public.app_feedback enable row level security;

drop policy if exists "Own feedback insert" on public.app_feedback;
create policy "Own feedback insert" on public.app_feedback
  for insert with check (user_id = (select auth.uid()));

drop policy if exists "Own or owner feedback read" on public.app_feedback;
create policy "Own or owner feedback read" on public.app_feedback
  for select using (user_id = (select auth.uid()) or public.is_platform_owner());
