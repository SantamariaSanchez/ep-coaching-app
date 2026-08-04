-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Phases de coaching (calibrage / optimisation / performance)
-- Exécute dans le Supabase SQL Editor (jamais automatisé par Vercel)
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : au démarrage du coaching d'un client, le coach a besoin d'une
-- phase de "calibrage" invisible du client pour vérifier qu'il adhère
-- vraiment au programme avant d'investir du temps à optimiser quoi que ce
-- soit. Table dédiée (plutôt qu'une colonne sur profiles) pour que la RLS
-- interdise tout accès client dès la base : aucune policy select pour le
-- client sur cette table, contrairement à subscription_events qui, lui,
-- reste lisible par le client (voir 20260801d_subscription_history.sql).
--
-- Une ligne = une période de phase. La phase "courante" d'un client est la
-- ligne avec ended_at IS NULL (au plus une par client, voir l'index unique
-- partiel ci dessous). L'historique complet est conservé pour audit et pour
-- que le coach voie l'évolution (voir getCoachingPhaseHistory).
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.client_coaching_phases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  phase text not null check (phase in ('calibrage', 'optimisation', 'performance')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

-- Au plus une phase "ouverte" (ended_at is null) par client à la fois.
create unique index if not exists client_coaching_phases_one_open_idx
  on public.client_coaching_phases (client_id)
  where ended_at is null;

create index if not exists client_coaching_phases_client_idx
  on public.client_coaching_phases (client_id, started_at desc);

alter table public.client_coaching_phases enable row level security;

-- Volontairement AUCUNE policy pour client_id = auth.uid() : cette table ne
-- doit jamais être lisible ni modifiable depuis l'espace du client, y
-- compris via un appel direct à l'API REST Supabase avec sa propre session.
-- Seul le coach propriétaire de ce client peut lire/écrire (is_own_coach,
-- déjà utilisé par client_supplements, client_tasks, etc.).
drop policy if exists "Coach manages own client coaching phases" on public.client_coaching_phases;
create policy "Coach manages own client coaching phases" on public.client_coaching_phases
  for all using (public.is_own_coach(client_id))
  with check (public.is_own_coach(client_id));
