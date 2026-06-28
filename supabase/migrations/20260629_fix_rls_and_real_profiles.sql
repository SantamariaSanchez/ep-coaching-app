-- ═══════════════════════════════════════════════════════════
-- EP Coaching — Fix RLS bloquant (ressources/communauté) +
-- vrais profils (bio, avatar, vue publique)
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── 1. FIX — la RLS a été (ré)activée sans policy sur ces 3 tables,
-- ce qui bloque silencieusement toute lecture ET écriture pour les
-- utilisateurs normaux (seul le service role passe). C'est la cause
-- du "ça ne publie pas" sur Ressources / Victoires / Questions.
-- On revient à l'état voulu : app privée coach/client, pas de RLS strict.

alter table public.resources disable row level security;
alter table public.community_posts disable row level security;
alter table public.community_comments disable row level security;

-- ── 2. PROFILS — bio + avatar pour une vraie page profil ─────

alter table public.profiles
  add column if not exists bio text,
  add column if not exists avatar_url text;

-- ── 3. STORAGE — photos de profil ─────────────────────────────

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "Authenticated users can upload avatars" on storage.objects;
create policy "Authenticated users can upload avatars" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update avatars" on storage.objects;
create policy "Authenticated users can update avatars" on storage.objects
  for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');
