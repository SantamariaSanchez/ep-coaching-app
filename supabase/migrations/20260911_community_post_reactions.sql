-- ═══════════════════════════════════════════════════════════
-- EP Coaching — Réactions ("Bravo") sur les posts Communauté
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Jusqu'ici, la seule façon d'encourager une victoire ou une question postée
-- par quelqu'un d'autre était d'écrire un commentaire — un geste qui demande
-- de taper du texte. Pour beaucoup de monde ça n'arrive jamais, donc un post
-- reste souvent sans aucune réaction visible, ce qui décourage d'en publier
-- un autre. Une réaction à un tap (façon "j'aime") est le geste le plus
-- léger possible pour montrer qu'on a vu et qu'on encourage, sans rien taper.
--
-- Un seul type de réaction (pas un choix d'emojis) : suffisant pour l'usage
-- réel (encourager), plus simple à afficher et à maintenir qu'un système de
-- réactions multiples. Aucun point de gamification accordé pour réagir
-- (seulement pour publier, voir POINTS dans lib/gamification-types.ts) —
-- ouvrir des points ici inviterait à réagir pour soi-même farmer des points,
-- pas pour encourager quelqu'un d'autre.

create table if not exists public.community_post_reactions (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, author_id)
);

create index if not exists idx_community_post_reactions_post
  on public.community_post_reactions(post_id);

alter table public.community_post_reactions enable row level security;

-- Policies écrites directement avec (select auth.uid()/auth.role()) — pas de
-- appel nu à auth.*() — pour ne pas reproduire le problème de performance
-- corrigé après coup sur les tables voisines (voir migration
-- 20260814o_rls_initplan_perf_fix.sql).

drop policy if exists "Authenticated users can read reactions" on public.community_post_reactions;
create policy "Authenticated users can read reactions" on public.community_post_reactions
  for select using ((select auth.role()) = 'authenticated');

drop policy if exists "Users can react as themselves" on public.community_post_reactions;
create policy "Users can react as themselves" on public.community_post_reactions
  for insert with check ((select auth.uid()) = author_id);

drop policy if exists "Users can remove their own reaction" on public.community_post_reactions;
create policy "Users can remove their own reaction" on public.community_post_reactions
  for delete using ((select auth.uid()) = author_id);
