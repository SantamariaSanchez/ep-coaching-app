-- Axe 2 (VISION.md) : espace de création de contenu pour les coachs — un
-- endroit pour poser des idées/brouillons Insta/YouTube/LinkedIn au lieu
-- de les perdre dans des notes éparpillées. Volontairement scopé par coach
-- dès le départ (pas de risque de fuite inter-coach comme pour les leads
-- plateforme, chaque coach n'écrit et ne lit que ses propres idées).
create table if not exists public.content_ideas (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null default 'general' check (platform in ('instagram', 'youtube', 'linkedin', 'general')),
  title text not null,
  notes text,
  status text not null default 'idee' check (status in ('idee', 'brouillon', 'pret', 'publie')),
  source text not null default 'manuel' check (source in ('manuel', 'question')),
  source_question_id uuid references public.community_posts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_ideas_coach_id_idx on public.content_ideas(coach_id, status);

alter table public.content_ideas enable row level security;

drop policy if exists "Coach manages own content ideas" on public.content_ideas;
create policy "Coach manages own content ideas" on public.content_ideas
  for all using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
