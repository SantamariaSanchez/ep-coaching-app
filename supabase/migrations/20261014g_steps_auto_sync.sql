-- Synchro automatique des pas (2026-10-14). Retour direct du fondateur :
-- « quand je vais sur l'onglet steps, je veux savoir combien j'ai fait de pas,
-- pas remplir un truc chiant ». Un Raccourci iOS (Santé) ou une appli
-- d'automatisation Android (Health Connect) envoie le total du jour sur
-- POST /api/steps/ingest avec une clé personnelle.
--
-- Rejouable : tout est en "if not exists".

-- Une clé de synchro par personne. Seule l'empreinte SHA-256 est gardée, la
-- clé n'est montrée qu'une fois à la création. Aucune policy : la table n'est
-- lue et écrite que côté serveur (clé service), jamais depuis le navigateur.
create table if not exists public.step_sync_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique,
  token_hint text not null default '',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  last_source text
);

alter table public.step_sync_tokens enable row level security;

-- Origine du chiffre du jour (raccourci, manuel, oura, podometre, bilan) et
-- heure de la dernière synchro, pour afficher « synchronisé il y a 5 min ».
alter table public.step_logs add column if not exists source text;
alter table public.step_logs add column if not exists synced_at timestamptz;

notify pgrst, 'reload schema';
