-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Fondations multi-coach (SaaS pour coachs tiers)
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : jusqu'ici un seul coach existait (le propriétaire de l'app).
-- On introduit la possibilité d'avoir plusieurs coachs, chacun avec ses
-- propres clients, totalement cloisonnés (un coach ne voit jamais les
-- clients d'un autre coach, y compris le propriétaire de la plateforme).
--
-- Modèle retenu : chaque coach paie un abonnement SaaS à EP Coaching pour
-- utiliser l'outil avec ses propres clients (pas de Stripe Connect, le
-- coach facture ses clients comme il veut en dehors de l'appli).
-- ═══════════════════════════════════════════════════════════════════════

-- ── profiles : rattachement client → coach ─────────────────────────────
-- NULL tant qu'un client n'est rattaché à aucun coach (ne devrait pas
-- arriver en pratique après le backfill ci-dessous, mais reste nullable
-- pour ne jamais bloquer un insert si l'attribution échoue).
alter table public.profiles add column if not exists coach_id uuid references public.profiles(id);
create index if not exists idx_profiles_coach_id on public.profiles (coach_id);

-- ── profiles : identité & abonnement plateforme du coach ───────────────
-- is_platform_owner : marque le compte coach d'origine (EP Coaching) —
-- seul compte exempté de l'abonnement plateforme, seul compte à garder
-- accès à la Communauté (feature de marque EP Coaching, non ouverte aux
-- coachs tiers dans cette première version).
alter table public.profiles add column if not exists is_platform_owner boolean not null default false;

-- Statut de l'abonnement du COACH à la plateforme EP Coaching (à ne pas
-- confondre avec subscription_status, qui décrit l'abonnement d'un CLIENT
-- à son coach).
alter table public.profiles add column if not exists platform_subscription_status text
  check (platform_subscription_status in ('inactive', 'active', 'canceled'))
  not null default 'inactive';
alter table public.profiles add column if not exists platform_stripe_customer_id text;
alter table public.profiles add column if not exists platform_stripe_subscription_id text;

-- Code d'invitation unique par coach, utilisé dans le lien d'inscription
-- qu'il partage à ses propres clients (/auth/client?coach=CODE).
alter table public.profiles add column if not exists invite_code text unique;

-- ── Backfill : le coach existant devient le propriétaire de la plateforme ──
update public.profiles set is_platform_owner = true where role = 'coach';
update public.profiles set platform_subscription_status = 'active' where is_platform_owner = true;

update public.profiles client
  set coach_id = (select id from public.profiles where role = 'coach' and is_platform_owner = true limit 1)
  where client.role = 'client' and client.coach_id is null;

-- ── Helpers RLS ─────────────────────────────────────────────────────────

-- Un coach est bien LE coach du client visé (cloisonnement strict).
create or replace function public.is_own_coach(target_client_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles coach
    join public.profiles client on client.coach_id = coach.id
    where coach.id = auth.uid()
      and coach.role = 'coach'
      and client.id = target_client_id
  )
$$;

-- Le propriétaire historique de la plateforme (scoping de la Communauté,
-- exemption de l'abonnement plateforme).
create or replace function public.is_platform_owner()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'coach' and is_platform_owner = true
  )
$$;

-- ── RLS : remplace is_coach() par is_own_coach(client_id) sur les tables
-- sensibles rattachées à un client précis (cloisonnement par coach) ────

-- sessions
drop policy if exists "Users see own sessions" on public.sessions;
create policy "Users see own sessions" on public.sessions
  for select using (client_id = auth.uid() or public.is_own_coach(client_id));

drop policy if exists "Users update own sessions" on public.sessions;
create policy "Users update own sessions" on public.sessions
  for update using (client_id = auth.uid() or public.is_own_coach(client_id));

-- session_sets
drop policy if exists "Users see own session sets" on public.session_sets;
create policy "Users see own session sets" on public.session_sets
  for select using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id
        and (s.client_id = auth.uid() or public.is_own_coach(s.client_id))
    )
  );

drop policy if exists "Users update own session sets" on public.session_sets;
create policy "Users update own session sets" on public.session_sets
  for update using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id
        and (s.client_id = auth.uid() or public.is_own_coach(s.client_id))
    )
  );

-- food_logs
drop policy if exists "Users manage own food logs" on public.food_logs;
create policy "Users manage own food logs" on public.food_logs
  for all using (client_id = auth.uid() or public.is_own_coach(client_id));

-- nutrition_profiles
drop policy if exists "Users manage own nutrition profile" on public.nutrition_profiles;
create policy "Users manage own nutrition profile" on public.nutrition_profiles
  for all using (client_id = auth.uid() or public.is_own_coach(client_id));

-- daily_logs
drop policy if exists "Users manage own daily logs" on public.daily_logs;
create policy "Users manage own daily logs" on public.daily_logs
  for all using (client_id = auth.uid() or public.is_own_coach(client_id));

-- programs
drop policy if exists "Users see own programs" on public.programs;
create policy "Users see own programs" on public.programs
  for select using (client_id = auth.uid() or public.is_own_coach(client_id));

drop policy if exists "Users manage own programs" on public.programs;
create policy "Users manage own programs" on public.programs
  for insert with check (client_id = auth.uid() or public.is_own_coach(client_id));

drop policy if exists "Users update own programs" on public.programs;
create policy "Users update own programs" on public.programs
  for update using (client_id = auth.uid() or public.is_own_coach(client_id));

-- program_days
drop policy if exists "Program days via program owner" on public.program_days;
create policy "Program days via program owner" on public.program_days
  for all using (
    exists (
      select 1 from public.programs p
      where p.id = program_id
        and (p.client_id = auth.uid() or public.is_own_coach(p.client_id))
    )
  );

-- exercises
drop policy if exists "Exercises via program owner" on public.exercises;
create policy "Exercises via program owner" on public.exercises
  for all using (
    exists (
      select 1 from public.program_days pd
      join public.programs p on p.id = pd.program_id
      where pd.id = day_id
        and (p.client_id = auth.uid() or public.is_own_coach(p.client_id))
    )
  );

-- photo_updates
drop policy if exists "Users see own photos" on public.photo_updates;
create policy "Users see own photos" on public.photo_updates
  for select using (client_id = auth.uid() or public.is_own_coach(client_id));

-- roadmaps
drop policy if exists "Active clients and coach manage roadmaps" on public.roadmaps;
create policy "Active clients and coach manage roadmaps" on public.roadmaps
  for all using (client_id = auth.uid() or public.is_own_coach(client_id));

-- roadmap_phases
drop policy if exists "Roadmap phases via roadmap owner" on public.roadmap_phases;
create policy "Roadmap phases via roadmap owner" on public.roadmap_phases
  for all using (
    exists (
      select 1 from public.roadmaps r
      where r.id = roadmap_id
        and (r.client_id = auth.uid() or public.is_own_coach(r.client_id))
    )
  );

-- roadmap_objectives
drop policy if exists "Roadmap objectives via roadmap owner" on public.roadmap_objectives;
create policy "Roadmap objectives via roadmap owner" on public.roadmap_objectives
  for all using (
    exists (
      select 1 from public.roadmaps r
      where r.id = roadmap_id
        and (r.client_id = auth.uid() or public.is_own_coach(r.client_id))
    )
  );

-- messages : un client ne parle qu'à SON coach, un coach ne lit que les
-- messages échangés avec SES propres clients.
drop policy if exists "Message participants can read" on public.messages;
create policy "Message participants can read" on public.messages
  for select using (
    sender_id = auth.uid()
    or receiver_id = auth.uid()
  );

-- Un coach ne peut écrire qu'à SES propres clients, un client qu'à SON
-- propre coach — empêche un coach tiers de contacter le client d'un autre.
drop policy if exists "Active clients and coach can send messages" on public.messages;
create policy "Active clients and coach can send messages" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (
      public.is_own_coach(receiver_id)
      or (
        public.is_active_client()
        and exists (
          select 1 from public.profiles c
          where c.id = auth.uid() and c.coach_id = receiver_id
        )
      )
    )
  );

-- avatars (storage) : un coach ne gère que l'avatar de ses propres clients.
drop policy if exists "Users manage own avatar" on storage.objects;
create policy "Users manage own avatar" on storage.objects
  for all
  using (
    bucket_id = 'avatars'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_own_coach((storage.foldername(name))[1]::uuid)
    )
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- client_intake : la RLS était désactivée (voir 20260718b) ; on l'active
-- avec le même cloisonnement, en garde-fou en plus des Server Actions.
alter table public.client_intake enable row level security;

drop policy if exists "Users manage own intake" on public.client_intake;
create policy "Users manage own intake" on public.client_intake
  for all using (client_id = auth.uid() or public.is_own_coach(client_id));

-- check_ins (20260713_create_check_ins.sql utilisait is_coach() global)
drop policy if exists "Users manage own check-ins" on public.check_ins;
create policy "Users manage own check-ins" on public.check_ins
  for all using (client_id = auth.uid() or public.is_own_coach(client_id))
  with check (client_id = auth.uid() or public.is_own_coach(client_id));

-- ── community_posts / community_comments : modération réservée au
-- propriétaire de la plateforme, pas à n'importe quel coach tiers (la
-- Communauté reste une feature de marque EP Coaching pour l'instant) ──
drop policy if exists "Author or coach can delete a post" on public.community_posts;
create policy "Author or coach can delete a post" on public.community_posts
  for delete using (
    auth.uid() = author_id
    or public.is_platform_owner()
  );

drop policy if exists "Author or coach can delete a comment" on public.community_comments;
create policy "Author or coach can delete a comment" on public.community_comments
  for delete using (
    auth.uid() = author_id
    or public.is_platform_owner()
  );
