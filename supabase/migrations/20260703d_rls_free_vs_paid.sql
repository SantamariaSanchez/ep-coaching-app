-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — RLS defense-in-depth : tables sensibles client/coach
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : les contrôles d'accès principaux sont dans les Server Actions
-- Next.js. Ces policies Supabase ajoutent une couche de protection côté
-- base de données pour les tables contenant des données personnelles.
-- Le client admin (service role) bypass la RLS pour les appels coach.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Helper : is_coach ───────────────────────────────────────────────────
create or replace function public.is_coach()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'coach'
  )
$$;

-- ── Helper : is_active_client ───────────────────────────────────────────
create or replace function public.is_active_client()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'client'
      and subscription_status = 'active'
  )
$$;

-- ── sessions ────────────────────────────────────────────────────────────

alter table public.sessions enable row level security;

drop policy if exists "Users see own sessions" on public.sessions;
create policy "Users see own sessions" on public.sessions
  for select using (client_id = auth.uid() or public.is_coach());

drop policy if exists "Users insert own sessions" on public.sessions;
create policy "Users insert own sessions" on public.sessions
  for insert with check (client_id = auth.uid());

drop policy if exists "Users update own sessions" on public.sessions;
create policy "Users update own sessions" on public.sessions
  for update using (client_id = auth.uid() or public.is_coach());

-- ── session_sets ─────────────────────────────────────────────────────────

alter table public.session_sets enable row level security;

drop policy if exists "Users see own session sets" on public.session_sets;
create policy "Users see own session sets" on public.session_sets
  for select using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id
        and (s.client_id = auth.uid() or public.is_coach())
    )
  );

drop policy if exists "Users insert own session sets" on public.session_sets;
create policy "Users insert own session sets" on public.session_sets
  for insert with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and s.client_id = auth.uid()
    )
  );

drop policy if exists "Users update own session sets" on public.session_sets;
create policy "Users update own session sets" on public.session_sets
  for update using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id
        and (s.client_id = auth.uid() or public.is_coach())
    )
  );

drop policy if exists "Users delete own session sets" on public.session_sets;
create policy "Users delete own session sets" on public.session_sets
  for delete using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and s.client_id = auth.uid()
    )
  );

-- ── food_logs ───────────────────────────────────────────────────────────

alter table public.food_logs enable row level security;

drop policy if exists "Users manage own food logs" on public.food_logs;
create policy "Users manage own food logs" on public.food_logs
  for all using (client_id = auth.uid() or public.is_coach());

-- ── nutrition_profiles ──────────────────────────────────────────────────

alter table public.nutrition_profiles enable row level security;

drop policy if exists "Users manage own nutrition profile" on public.nutrition_profiles;
create policy "Users manage own nutrition profile" on public.nutrition_profiles
  for all using (client_id = auth.uid() or public.is_coach());

-- ── daily_logs ──────────────────────────────────────────────────────────

alter table public.daily_logs enable row level security;

drop policy if exists "Users manage own daily logs" on public.daily_logs;
create policy "Users manage own daily logs" on public.daily_logs
  for all using (client_id = auth.uid() or public.is_coach());

-- ── programs / program_days / exercises ────────────────────────────────

alter table public.programs enable row level security;

drop policy if exists "Users see own programs" on public.programs;
create policy "Users see own programs" on public.programs
  for select using (client_id = auth.uid() or public.is_coach());

drop policy if exists "Users manage own programs" on public.programs;
create policy "Users manage own programs" on public.programs
  for insert with check (client_id = auth.uid() or public.is_coach());

drop policy if exists "Users update own programs" on public.programs;
create policy "Users update own programs" on public.programs
  for update using (client_id = auth.uid() or public.is_coach());

alter table public.program_days enable row level security;

drop policy if exists "Program days via program owner" on public.program_days;
create policy "Program days via program owner" on public.program_days
  for all using (
    exists (
      select 1 from public.programs p
      where p.id = program_id
        and (p.client_id = auth.uid() or public.is_coach())
    )
  );

alter table public.exercises enable row level security;

drop policy if exists "Exercises via program owner" on public.exercises;
create policy "Exercises via program owner" on public.exercises
  for all using (
    exists (
      select 1 from public.program_days pd
      join public.programs p on p.id = pd.program_id
      where pd.id = day_id
        and (p.client_id = auth.uid() or public.is_coach())
    )
  );

-- ── messages ────────────────────────────────────────────────────────────
-- Seulement pour les clients actifs — les free ne peuvent pas envoyer
-- de messages privés au coach.

alter table public.messages enable row level security;

drop policy if exists "Message participants can read" on public.messages;
create policy "Message participants can read" on public.messages
  for select using (
    sender_id = auth.uid() or receiver_id = auth.uid()
  );

drop policy if exists "Active clients and coach can send messages" on public.messages;
create policy "Active clients and coach can send messages" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (public.is_coach() or public.is_active_client())
  );

-- ── photo_updates ────────────────────────────────────────────────────────
-- Utilisateurs voient leurs propres photos, le coach voit tout.

alter table public.photo_updates enable row level security;

drop policy if exists "Users see own photos" on public.photo_updates;
create policy "Users see own photos" on public.photo_updates
  for select using (client_id = auth.uid() or public.is_coach());

drop policy if exists "Users insert own photos" on public.photo_updates;
create policy "Users insert own photos" on public.photo_updates
  for insert with check (client_id = auth.uid());

-- ── roadmaps / roadmap_phases / roadmap_objectives ─────────────────────
-- Uniquement pour les clients actifs.

alter table public.roadmaps enable row level security;

drop policy if exists "Active clients and coach manage roadmaps" on public.roadmaps;
create policy "Active clients and coach manage roadmaps" on public.roadmaps
  for all using (client_id = auth.uid() or public.is_coach());

alter table public.roadmap_phases enable row level security;

drop policy if exists "Roadmap phases via roadmap owner" on public.roadmap_phases;
create policy "Roadmap phases via roadmap owner" on public.roadmap_phases
  for all using (
    exists (
      select 1 from public.roadmaps r
      where r.id = roadmap_id
        and (r.client_id = auth.uid() or public.is_coach())
    )
  );

alter table public.roadmap_objectives enable row level security;

drop policy if exists "Roadmap objectives via roadmap owner" on public.roadmap_objectives;
create policy "Roadmap objectives via roadmap owner" on public.roadmap_objectives
  for all using (
    exists (
      select 1 from public.roadmaps r
      where r.id = roadmap_id
        and (r.client_id = auth.uid() or public.is_coach())
    )
  );

-- ── community_posts — suppression par l'auteur ou le coach ───────────
drop policy if exists "Author or coach can delete a post" on public.community_posts;
create policy "Author or coach can delete a post" on public.community_posts
  for delete using (
    auth.uid() = author_id
    or public.is_coach()
  );

-- ── community_comments — suppression par l'auteur ou le coach ─────────
drop policy if exists "Author or coach can delete a comment" on public.community_comments;
create policy "Author or coach can delete a comment" on public.community_comments
  for delete using (
    auth.uid() = author_id
    or public.is_coach()
  );

-- ── Storage policies — avatars bucket (privé) ──────────────────────────
-- Le bucket "avatars" doit être configuré en mode PRIVÉ dans le dashboard
-- Supabase (Storage > Buckets > avatars > cocher "Private").
-- Ces policies autorisent les utilisateurs à lire/écrire uniquement leurs propres avatars.

drop policy if exists "Users manage own avatar" on storage.objects;
create policy "Users manage own avatar" on storage.objects
  for all
  using (
    bucket_id = 'avatars'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_coach())
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
