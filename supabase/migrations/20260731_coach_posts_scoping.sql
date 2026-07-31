-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Cloisonnement de "Mot du coach" (coach_posts) par coach
-- Exécute APRÈS 20260729b_multi_coach_foundation.sql
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : contrairement à la Communauté (victoires/questions), qui reste
-- volontairement un espace partagé entre tous les coachs et tous les
-- clients, "Mot du coach" est un contenu propre à un coach pour SES
-- clients. getCoachPosts() ne filtrait par rien : un client voyait le "mot
-- du coach" de tous les coachs de la plateforme, pas seulement le sien.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.coach_posts add column if not exists coach_id uuid references public.profiles(id);

-- Backfill : l'auteur d'un coach_post est toujours lui-même le coach.
update public.coach_posts set coach_id = author_id where coach_id is null;

alter table public.coach_posts alter column coach_id set not null;
create index if not exists idx_coach_posts_coach_id on public.coach_posts (coach_id, created_at desc);

-- Calcule le "scope coach" de l'utilisateur courant : son propre id s'il est
-- coach, ou l'id de son coach s'il est client. Sert à comparer directement
-- à coach_posts.coach_id sans dupliquer cette logique dans chaque policy.
create or replace function public.my_coach_scope()
returns uuid
language sql
security definer
stable
as $$
  select case when role = 'coach' then id else coach_id end
  from public.profiles where id = auth.uid()
$$;

-- Empêche un client d'insérer un coach_id arbitraire : toujours recalculé
-- côté serveur à partir de l'auteur réel, avant la vérification RLS.
create or replace function public.set_coach_post_scope()
returns trigger
language plpgsql
security definer
as $$
begin
  new.coach_id := (select case when role = 'coach' then id else coach_id end from public.profiles where id = new.author_id);
  return new;
end;
$$;

drop trigger if exists trg_set_coach_post_scope on public.coach_posts;
create trigger trg_set_coach_post_scope
  before insert or update of author_id on public.coach_posts
  for each row execute function public.set_coach_post_scope();

alter table public.coach_posts enable row level security;

drop policy if exists "Members read their own coach's posts" on public.coach_posts;
create policy "Members read their own coach's posts" on public.coach_posts
  for select using (coach_id = public.my_coach_scope());

drop policy if exists "Coach creates their own posts" on public.coach_posts;
create policy "Coach creates their own posts" on public.coach_posts
  for insert with check (
    auth.uid() = author_id
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );

drop policy if exists "Coach manages their own posts" on public.coach_posts;
create policy "Coach manages their own posts" on public.coach_posts
  for update using (auth.uid() = author_id);

drop policy if exists "Coach deletes their own posts" on public.coach_posts;
create policy "Coach deletes their own posts" on public.coach_posts
  for delete using (auth.uid() = author_id);
