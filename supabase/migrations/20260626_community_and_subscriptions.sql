-- ═══════════════════════════════════════════════════════════
-- EP Coaching — Abonnement Stripe (gratuit/payant) + Communauté
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── 1. ABONNEMENT (profiles) ────────────────────────────────

alter table public.profiles
  add column if not exists subscription_status text not null default 'free'
    check (subscription_status in ('free', 'active', 'canceled')),
  add column if not exists subscription_plan text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create index if not exists idx_profiles_stripe_customer on public.profiles(stripe_customer_id);

-- Grandfather in every client that already existed before this migration —
-- only NEW signups after this point should start on the free tier.
-- Coaches are unaffected by subscription gating either way.
update public.profiles
set subscription_status = 'active'
where role = 'client';

-- ── 2. COMMUNAUTÉ — Victoires & Questions ───────────────────

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('victory', 'question')),
  content text not null,
  image_url text,
  status text not null default 'open' check (status in ('open', 'answered')),
  created_at timestamptz not null default now()
);

create index if not exists idx_community_posts_type on public.community_posts(type, created_at desc);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_community_comments_post on public.community_comments(post_id, created_at);

-- App privée coach/client, pas besoin de RLS strict (cohérent avec le reste du schéma).
alter table public.community_posts disable row level security;
alter table public.community_comments disable row level security;

-- ── 3. STORAGE — photos de victoires ─────────────────────────

insert into storage.buckets (id, name, public)
values ('community-photos', 'community-photos', true)
on conflict (id) do nothing;

drop policy if exists "Community photos are publicly readable" on storage.objects;
create policy "Community photos are publicly readable" on storage.objects
  for select using (bucket_id = 'community-photos');

drop policy if exists "Authenticated users can upload community photos" on storage.objects;
create policy "Authenticated users can upload community photos" on storage.objects
  for insert with check (bucket_id = 'community-photos' and auth.role() = 'authenticated');
