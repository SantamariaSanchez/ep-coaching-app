-- ═══════════════════════════════════════════════════════════
-- EP Coaching — RLS robuste sur resources / community_posts /
-- community_comments (au lieu de juste désactiver la RLS)
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Contexte : la migration précédente désactivait la RLS sur ces 3 tables,
-- mais quelque chose (probablement le "Security Advisor" de Supabase, ou un
-- clic sur "Enable RLS" dans le Table Editor) l'a réactivée depuis, sans
-- aucune policy — ce qui bloque à nouveau silencieusement toute lecture ET
-- écriture pour les comptes normaux. Au lieu de la désactiver à nouveau (et
-- de revivre le même problème au prochain "Enable RLS"), on active la RLS
-- avec de vraies policies qui autorisent ce qu'il faut. Comme ça, que la RLS
-- soit "on" ou "off" ne change plus rien.

-- ── community_posts ──────────────────────────────────────────

alter table public.community_posts enable row level security;

drop policy if exists "Authenticated users can read posts" on public.community_posts;
create policy "Authenticated users can read posts" on public.community_posts
  for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can create their own posts" on public.community_posts;
create policy "Authenticated users can create their own posts" on public.community_posts
  for insert with check (auth.uid() = author_id);

drop policy if exists "Author or coach can update a post" on public.community_posts;
create policy "Author or coach can update a post" on public.community_posts
  for update using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );

-- ── community_comments ───────────────────────────────────────

alter table public.community_comments enable row level security;

drop policy if exists "Authenticated users can read comments" on public.community_comments;
create policy "Authenticated users can read comments" on public.community_comments
  for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can create their own comments" on public.community_comments;
create policy "Authenticated users can create their own comments" on public.community_comments
  for insert with check (auth.uid() = author_id);

-- ── resources ─────────────────────────────────────────────────

alter table public.resources enable row level security;

drop policy if exists "Authenticated users can read resources" on public.resources;
create policy "Authenticated users can read resources" on public.resources
  for select using (auth.role() = 'authenticated');

-- No insert/update/delete policy on purpose: publishing/removing a resource
-- always goes through /api/coach/resources, which uses the service-role
-- admin client and therefore bypasses RLS entirely regardless.
