-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Durcissement sécurité RLS (audit du 2026-08-04)
-- Exécute dans le Supabase SQL Editor (jamais automatisé par Vercel)
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : audit de sécurité a trouvé la RLS (row level security)
-- DÉSACTIVÉE sur plusieurs tables en production contenant des données
-- personnelles/sensibles, dont "profiles" (le compte de chaque utilisateur,
-- rôle, statut d'abonnement...). Concrètement, n'importe quel utilisateur
-- authentifié pouvait, via un appel direct à l'API REST Supabase (donc en
-- contournant entièrement l'appli), lire ou modifier les données de
-- n'importe quel autre utilisateur sur ces tables.
--
-- En parallèle, plusieurs policies existantes datant d'avant le passage en
-- plateforme multi-coach (20260729b_multi_coach_foundation.sql) autorisent
-- "n'importe quel coach" (role = 'coach') à lire les données de TOUS les
-- clients, y compris ceux d'un autre coach tiers — pas seulement les siens.
-- Cette migration les remplace par is_own_coach(), déjà utilisé ailleurs.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Activer RLS sur les tables où elle était désactivée ────────────────
-- (policies déjà présentes pour la plupart, elles n'étaient simplement pas
-- appliquées faute de RLS active sur la table)

alter table public.check_ins enable row level security;
alter table public.diet_plans enable row level security;
alter table public.diet_plan_meals enable row level security;
alter table public.foods enable row level security;
alter table public.measurements enable row level security;
alter table public.personal_records enable row level security;
alter table public.profiles enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminders enable row level security;
alter table public.coach_notes enable row level security;
alter table public.key_decisions enable row level security;
alter table public.gamification_points enable row level security;
alter table public.mindset_habit_logs enable row level security;
alter table public.mindset_journal_entries enable row level security;
alter table public.mindset_profiles enable row level security;
alter table public.notifications enable row level security;
alter table public.workout_logs enable row level security;

-- ── 2. check_ins — supprime les anciennes policies "tout coach voit tout" ──
-- "Users manage own check-ins" (déjà en place, scope is_own_coach) suffit.

drop policy if exists "Client insère son check-in" on public.check_ins;
drop policy if exists "Client voit ses check-ins" on public.check_ins;
drop policy if exists "Coach voit tous les check-ins" on public.check_ins;
drop policy if exists "Coach peut mettre à jour les bilans" on public.check_ins;

drop policy if exists "Users manage own check-ins" on public.check_ins;
create policy "Users manage own check-ins" on public.check_ins
  for all using (client_id = auth.uid() or public.is_own_coach(client_id))
  with check (client_id = auth.uid() or public.is_own_coach(client_id));

-- ── 3. diet_plans / diet_plan_meals — étaient ouvertes à tout utilisateur
-- authentifié (qual = true), pas seulement au propriétaire/son coach.

drop policy if exists "Coach manages diet plans" on public.diet_plans;
create policy "Users manage own diet plans" on public.diet_plans
  for all using (client_id = auth.uid() or public.is_own_coach(client_id))
  with check (client_id = auth.uid() or public.is_own_coach(client_id));

drop policy if exists "Coach manages diet plan meals" on public.diet_plan_meals;
create policy "Users manage own diet plan meals" on public.diet_plan_meals
  for all using (
    exists (
      select 1 from public.diet_plans dp
      where dp.id = plan_id
        and (dp.client_id = auth.uid() or public.is_own_coach(dp.client_id))
    )
  )
  with check (
    exists (
      select 1 from public.diet_plans dp
      where dp.id = plan_id
        and (dp.client_id = auth.uid() or public.is_own_coach(dp.client_id))
    )
  );

-- ── 4. measurements — était "all access" (qual = true) pour tout le monde ──

drop policy if exists "all access measurements" on public.measurements;
create policy "Users manage own measurements" on public.measurements
  for all using (client_id = auth.uid() or public.is_own_coach(client_id))
  with check (client_id = auth.uid() or public.is_own_coach(client_id));

-- ── 5. coach_notes / key_decisions — notes de suivi coach ──────────────────
-- Le client voit son propre dernier mot du coach (utilisé sur le dashboard
-- client) mais n'écrit jamais ces tables. Le coach gère tout, sur ses
-- propres clients uniquement.

drop policy if exists "Coach manages own client notes" on public.coach_notes;
create policy "Coach manages own client notes" on public.coach_notes
  for all using (public.is_own_coach(client_id))
  with check (public.is_own_coach(client_id));

drop policy if exists "Client reads own coach notes" on public.coach_notes;
create policy "Client reads own coach notes" on public.coach_notes
  for select using (client_id = auth.uid());

drop policy if exists "Coach manages own client key decisions" on public.key_decisions;
create policy "Coach manages own client key decisions" on public.key_decisions
  for all using (public.is_own_coach(client_id))
  with check (public.is_own_coach(client_id));

-- ── 6. gamification_points — ledger de points, écrit uniquement via le
-- client admin (service role) côté serveur. Lecture seule pour le
-- propriétaire/son coach, aucune écriture directe autorisée (anti-triche).

drop policy if exists "Owner or coach reads gamification points" on public.gamification_points;
create policy "Owner or coach reads gamification points" on public.gamification_points
  for select using (client_id = auth.uid() or public.is_own_coach(client_id));

-- ── 7. mindset_profiles / mindset_habit_logs / mindset_journal_entries ────
-- Espace personnel du client (quiz, habitudes, journal) — géré uniquement
-- par son propriétaire.

drop policy if exists "Users manage own mindset profile" on public.mindset_profiles;
create policy "Users manage own mindset profile" on public.mindset_profiles
  for all using (client_id = auth.uid() or public.is_own_coach(client_id))
  with check (client_id = auth.uid());

drop policy if exists "Users manage own habit logs" on public.mindset_habit_logs;
create policy "Users manage own habit logs" on public.mindset_habit_logs
  for all using (client_id = auth.uid() or public.is_own_coach(client_id))
  with check (client_id = auth.uid());

drop policy if exists "Users manage own journal entries" on public.mindset_journal_entries;
create policy "Users manage own journal entries" on public.mindset_journal_entries
  for all using (client_id = auth.uid() or public.is_own_coach(client_id))
  with check (client_id = auth.uid());

-- ── 8. workout_logs — historique de séances (volume/charges) ──────────────

drop policy if exists "Users manage own workout logs" on public.workout_logs;
create policy "Users manage own workout logs" on public.workout_logs
  for all using (client_id = auth.uid() or public.is_own_coach(client_id))
  with check (client_id = auth.uid());

-- ── 9. notifications — l'appli ne lit/écrit que via le client admin
-- côté serveur (userId déjà vérifié en amont), mais on pose un filet de
-- sécurité au niveau base pour bloquer tout accès direct via l'API REST.

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications
  for select using (user_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications
  for update using (user_id = auth.uid() or recipient_id = auth.uid());

-- ── 10. Autres tables déjà en RLS mais avec la même faille "tout coach
-- voit tout" (pré-multi-coach) — remplace par is_own_coach().

drop policy if exists "Owner or coach can read step logs" on public.step_logs;
create policy "Owner or coach can read step logs" on public.step_logs
  for select using (client_id = auth.uid() or public.is_own_coach(client_id));

drop policy if exists "Owner or coach can read routine items" on public.step_routine_items;
create policy "Owner or coach can read routine items" on public.step_routine_items
  for select using (client_id = auth.uid() or public.is_own_coach(client_id));

drop policy if exists "Owner or coach can read step settings" on public.step_settings;
create policy "Owner or coach can read step settings" on public.step_settings
  for select using (client_id = auth.uid() or public.is_own_coach(client_id));

drop policy if exists "Owner or coach can read biometric insights" on public.biometric_insights;
create policy "Owner or coach can read biometric insights" on public.biometric_insights
  for select using (client_id = auth.uid() or public.is_own_coach(client_id));

drop policy if exists "Owner or coach can read biometric logs" on public.biometric_logs;
create policy "Owner or coach can read biometric logs" on public.biometric_logs
  for select using (client_id = auth.uid() or public.is_own_coach(client_id));

-- ── 11. profiles — anti-élévation de privilèges ────────────────────────────
-- La policy UPDATE existante ("Users can update own profile") autorise un
-- utilisateur à modifier N'IMPORTE QUELLE colonne de sa propre ligne, y
-- compris role, is_platform_owner, coach_id, subscription_status... Un
-- appel direct à l'API REST (hors app) suffisait à s'auto-promouvoir coach
-- ou propriétaire de plateforme. Ce trigger fige ces colonnes pour tout
-- appelant qui n'est pas le service role (le client admin utilisé par les
-- server actions coach/admin, qui bypass RLS et triggers de policy — mais
-- pas les triggers de table, d'où le bypass explicite ci-dessous).

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  new.role := old.role;
  new.is_platform_owner := old.is_platform_owner;
  new.coach_id := old.coach_id;
  new.subscription_status := old.subscription_status;
  new.subscription_plan := old.subscription_plan;
  new.stripe_customer_id := old.stripe_customer_id;
  new.stripe_subscription_id := old.stripe_subscription_id;
  new.platform_subscription_status := old.platform_subscription_status;
  new.platform_stripe_customer_id := old.platform_stripe_customer_id;
  new.platform_stripe_subscription_id := old.platform_stripe_subscription_id;
  new.status := old.status;
  new.invite_code := old.invite_code;
  new.checkin_day := old.checkin_day;
  new.next_billing_date := old.next_billing_date;
  new.external_payment_link := old.external_payment_link;

  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_columns on public.profiles;
create trigger protect_profile_privileged_columns
before update on public.profiles
for each row execute function public.protect_profile_privileged_columns();

-- ── 12. Durcissement mineur — search_path mutable sur les fonctions
-- SECURITY DEFINER (recommandation du linter Supabase, évite un
-- détournement de search_path).

alter function public.is_coach() set search_path = public;
alter function public.is_active_client() set search_path = public;
alter function public.is_platform_owner() set search_path = public;
alter function public.is_own_coach(uuid) set search_path = public;
alter function public.is_own_coach_of_viewer(uuid) set search_path = public;
alter function public.my_coach_scope() set search_path = public;
alter function public.set_coach_post_scope() set search_path = public;
alter function public.update_photo_frequency() set search_path = public;

-- ── 13. Vue food_log_popularity — SECURITY DEFINER inutile (agrégat
-- public, aucune donnée sensible), on repasse en SECURITY INVOKER par
-- défaut pour respecter les droits de l'appelant.

alter view public.food_log_popularity set (security_invoker = true);
