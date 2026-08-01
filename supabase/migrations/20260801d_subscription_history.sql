-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Historique de paiement client (remplace le simple toggle)
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : le statut payant/gratuit d'un client était géré par un simple
-- interrupteur, sans trace de quand/pourquoi il a changé, ni du plan ni de
-- la prochaine échéance. Chaque changement est maintenant journalisé.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  changed_by uuid references public.profiles(id),
  status text not null check (status in ('free', 'active', 'canceled')),
  plan text,
  next_billing_date date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscription_events_client on public.subscription_events (client_id, created_at desc);

alter table public.subscription_events enable row level security;

-- Le client voit son propre historique, son coach voit celui de ses clients.
drop policy if exists "Client and coach see subscription history" on public.subscription_events;
create policy "Client and coach see subscription history" on public.subscription_events
  for select using (
    client_id = auth.uid() or public.is_own_coach(client_id)
  );

-- Seul le coach du client peut journaliser un changement.
drop policy if exists "Coach logs subscription changes" on public.subscription_events;
create policy "Coach logs subscription changes" on public.subscription_events
  for insert with check (
    public.is_own_coach(client_id)
  );

alter table public.profiles add column if not exists next_billing_date date;

-- ── Lien de paiement Stripe personnel d'un coach tiers ──────────────────
-- Chaque coach tiers facture ses propres clients en dehors de l'appli (pas
-- de Stripe Connect). Ce champ lui permet de renseigner son propre lien de
-- paiement Stripe pour le partager facilement à ses clients depuis l'appli.
alter table public.profiles add column if not exists external_payment_link text;

-- ── Preuve d'acceptation des CGU/CGV à l'inscription coach ──────────────
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
