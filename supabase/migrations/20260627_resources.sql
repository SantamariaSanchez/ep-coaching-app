-- ═══════════════════════════════════════════════════════════
-- EP Coaching — Ressources (PDF / guides / lead magnets)
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_url text not null,
  file_path text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_resources_created on public.resources(created_at desc);

-- App privée coach/client, pas besoin de RLS strict (cohérent avec le reste du schéma).
alter table public.resources disable row level security;

insert into storage.buckets (id, name, public)
values ('resources', 'resources', true)
on conflict (id) do nothing;

drop policy if exists "Resources are publicly readable" on storage.objects;
create policy "Resources are publicly readable" on storage.objects
  for select using (bucket_id = 'resources');

drop policy if exists "Authenticated users can upload resources" on storage.objects;
create policy "Authenticated users can upload resources" on storage.objects
  for insert with check (bucket_id = 'resources' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete resources" on storage.objects;
create policy "Authenticated users can delete resources" on storage.objects
  for delete using (bucket_id = 'resources' and auth.role() = 'authenticated');
