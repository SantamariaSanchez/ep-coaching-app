-- Salles d'entraînement d'un client (ou du coach pour lui-même), avec leur
-- équipement (clés du catalogue lib/gym-equipment.ts) et des photos de
-- machines. Une séance du programme peut être rattachée à une salle
-- (program_days.gym_id) : seuls les exercices faisables avec l'équipement de
-- cette salle sont alors proposés.
-- À exécuter à la main dans le SQL Editor Supabase. Le code fonctionne sans
-- cette migration (aucune salle, aucun filtre).

create table if not exists public.training_gyms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  city text,
  address text,
  kind text not null default 'custom' check (kind in ('commerciale','crossfit','home_gym','poids_du_corps','custom')),
  equipment text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists training_gyms_owner_idx on public.training_gyms (owner_id);

create table if not exists public.training_gym_photos (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.training_gyms(id) on delete cascade,
  url text not null,
  storage_path text,
  equipment text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists training_gym_photos_gym_idx on public.training_gym_photos (gym_id);

-- RLS activée sans politique : lecture et écriture uniquement via le serveur (client admin).
alter table public.training_gyms enable row level security;
alter table public.training_gym_photos enable row level security;

alter table public.program_days add column if not exists gym_id uuid references public.training_gyms(id) on delete set null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gym-photos', 'gym-photos', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "gym-photos public read" on storage.objects for select to public using (bucket_id = 'gym-photos');
