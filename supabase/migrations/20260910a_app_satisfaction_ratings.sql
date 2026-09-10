-- Brainstorm "2 avatars" (2026-09-10) : aucun signal produit n'existe nulle
-- part dans l'appli (NPS, satisfaction, note...) — le fondateur navigue à
-- l'aveugle sur "est-ce que les gens trouvent ça utile cette semaine ?".
-- Table volontairement minimale : une note 1-5 + commentaire libre optionnel,
-- horodatée. `context` distingue d'où vient la note (aujourd'hui pour
-- l'instant, extensible plus tard sans migration supplémentaire) sans
-- complexifier l'écriture actuelle qui ne connaît qu'une seule valeur.
create table if not exists public.app_satisfaction_ratings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  context text not null default 'aujourdhui',
  created_at timestamptz not null default now()
);

-- Une seule lecture utile pour l'instant : "la dernière note de ce client",
-- pour savoir si on lui repropose la question (pas plus d'une fois/semaine).
create index if not exists app_satisfaction_ratings_client_created_idx
  on public.app_satisfaction_ratings (client_id, created_at desc);

alter table public.app_satisfaction_ratings enable row level security;

-- Le client écrit sa propre note, jamais celle d'un autre.
drop policy if exists "Client inserts own satisfaction rating" on public.app_satisfaction_ratings;
create policy "Client inserts own satisfaction rating" on public.app_satisfaction_ratings
  for insert to authenticated
  with check (client_id = (select auth.uid()));

-- Volontairement pas de update/delete : une note est un instantané, pas un
-- état éditable — évite qu'une note gênante soit retirée après coup.
drop policy if exists "Client reads own satisfaction ratings" on public.app_satisfaction_ratings;
create policy "Client reads own satisfaction ratings" on public.app_satisfaction_ratings
  for select to authenticated
  using (client_id = (select auth.uid()));
