-- Rattache une ou plusieurs fiches de la bibliothèque "Contraintes &
-- populations spécifiques" (lib/medical-constraints.ts, /dashboard/coach/
-- contraintes) à un client précis, pour que cette référence devienne un
-- outil attaché au suivi réel plutôt qu'une bibliothèque qu'il faut penser
-- à aller consulter à part. Demande directe 2026-09-09 : les onglets
-- "qui ne servent à rien d'utile mais que de l'info" (le médical cité en
-- exemple) doivent devenir de vrais outils, pas juste de la valeur en
-- lecture.
--
-- Même parti pris que client_tasks (20260621) : RLS désactivée, l'accès
-- passe uniquement par les server actions qui vérifient déjà la relation
-- coach/client via requireOwnClient() avant tout appel, jamais interrogée
-- directement depuis le client.
create table if not exists public.client_medical_constraints (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  coach_id uuid references auth.users(id),
  constraint_slug text not null,
  note text,
  created_at timestamptz not null default now(),
  unique (client_id, constraint_slug)
);

create index if not exists client_medical_constraints_client_idx
  on public.client_medical_constraints (client_id);

alter table public.client_medical_constraints disable row level security;

-- Journal de reprise, spécifique à la fiche "blessures-reeducation" : son
-- propre contenu recommande explicitement de "documenter chaque séance de
-- reprise (charge, répétitions, douleur ressentie sur 10) pour objectiver
-- la progression réelle plutôt que le ressenti du jour" — jusqu'ici rien
-- ne permettait de le faire réellement, seulement de le lire dans la fiche.
create table if not exists public.client_recovery_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  coach_id uuid references auth.users(id),
  log_date date not null default current_date,
  zone text not null,
  load_note text,
  pain smallint not null check (pain between 0 and 10),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists client_recovery_logs_client_idx
  on public.client_recovery_logs (client_id, log_date desc);

alter table public.client_recovery_logs disable row level security;
