-- Récompense monétaire de parrainage (demande explicite 2026-08-16 :
-- "mois offert / réduction sur l'abonnement"), en plus des points déjà
-- distribués par le programme existant (voir
-- supabase/migrations/20260814_referral_program.sql et POINTS.referral
-- dans lib/gamification-types.ts, inchangé). Table séparée plutôt qu'une
-- colonne sur profiles : une ligne par filleul qui devient payant, avec un
-- statut, pour ne jamais créditer deux fois le même parrainage même si le
-- webhook Stripe rejoue l'événement (Stripe garantit "au moins une fois",
-- jamais "exactement une fois").
create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null unique references public.profiles(id) on delete cascade,
  amount_cents integer not null,
  status text not null default 'pending' check (status in ('pending', 'credited', 'skipped')),
  created_at timestamptz not null default now(),
  credited_at timestamptz
);

create index if not exists referral_rewards_referrer_idx on public.referral_rewards(referrer_id, status);

alter table public.referral_rewards enable row level security;

-- Lecture seule pour le parrain concerné (voir le statut de sa propre
-- récompense) ; toute écriture passe par le webhook Stripe côté serveur
-- (client admin, RLS contournée), jamais par une policy insert/update ici.
create policy "referral_rewards_referrer_read" on public.referral_rewards
  for select
  using (referrer_id = (select auth.uid()));
