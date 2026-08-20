-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Import auto Stripe dans la compta perso du coach (Axe 4)
-- Déjà exécutée manuellement en production via le MCP Supabase.
-- ═══════════════════════════════════════════════════════════════════════
-- "Reste à faire" documenté le 2026-08-14 : "Lien avec Stripe (revenus
-- automatiquement importés plutôt que ressaisis)... à cadrer si l'usage de
-- la v1 montre que la saisie manuelle est le vrai point de friction." Le
-- cadrage a été fait le 2026-08-20 (décision directe). Voir
-- lib/coach-finance-stripe-import.ts pour la logique.
--
-- stripe_event_id : clé d'idempotence — un webhook Stripe peut être
-- redélivré (retry réseau, etc.), l'unique index empêche un double import
-- de la même session de paiement. source distingue une ligne saisie à la
-- main d'une ligne importée automatiquement (affiché dans l'UI pour ne
-- jamais laisser un coach se demander d'où vient une ligne qu'il n'a pas
-- lui-même créée).

alter table public.coach_finance_entries
  add column if not exists stripe_event_id text,
  add column if not exists source text not null default 'manual' check (source in ('manual', 'stripe'));

create unique index if not exists coach_finance_entries_stripe_event_idx
  on public.coach_finance_entries (coach_id, stripe_event_id)
  where stripe_event_id is not null;
