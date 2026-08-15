-- Idéation (ex "Idées & brouillons") passe de 1 liste à un vrai espace de
-- travail créatif — demande explicite du 2026-08-15 : "pas juste 2 petits
-- onglets, hyper complet". Deux nouvelles tables, même forme que
-- content_ideas (déjà en place, voir lib/content-ideas.ts) : une seule
-- policy ALL par coach_id, RLS avec (select auth.uid()) directement
-- (MASTERCLASS.md Axe I — jamais l'appel nu qui force une réévaluation
-- ligne par ligne).

-- coach_notes existe déjà pour un tout autre usage (notes de suivi
-- hebdomadaire PAR CLIENT, voir components/ui/NoteTemplates.tsx) — nom
-- distinct exprès pour ne jamais collisionner.
create table if not exists public.coach_ideation_notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.coach_ideation_notes is
  'Prise de notes libre du coach (Idéation) — pense-bêtes, brouillons de posts, tout ce qui ne rentre pas dans le pipeline idée/brouillon/prêt/publié de content_ideas.';

create index if not exists coach_ideation_notes_coach_id_idx on public.coach_ideation_notes (coach_id, pinned desc, updated_at desc);

alter table public.coach_ideation_notes enable row level security;

create policy "Coach manages own ideation notes" on public.coach_ideation_notes
  for all
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

create table if not exists public.coach_inspirations (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  platform text not null default 'general',
  note text,
  created_at timestamptz not null default now()
);

comment on table public.coach_inspirations is
  'Swipe file du coach (Idéation) — liens vus ailleurs qui méritent de servir de référence pour du contenu futur.';

create index if not exists coach_inspirations_coach_id_idx on public.coach_inspirations (coach_id, created_at desc);

alter table public.coach_inspirations enable row level security;

create policy "Coach manages own inspirations" on public.coach_inspirations
  for all
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));
