-- Notes façon Obsidian/Tana (2026-09-30) : un fouillis qui se range tout
-- seul avec des supertags (#tag), des liens entre notes ([[Titre]]), des
-- captures d'écran, des dictées transcrites et une recherche plein texte.
-- Pour tout le monde (coach, client, membre), chacun ne voit que ses notes.
-- array_to_string n'est pas "immutable" : petite enveloppe pour pouvoir
-- l'utiliser dans la colonne de recherche générée.
create or replace function public.notes_tags_text(tags text[]) returns text
language sql immutable parallel safe as $$ select coalesce(array_to_string(tags, ' '), '') $$;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default '',
  body text not null default '',
  tags text[] not null default '{}',
  kind text not null default 'note' check (kind in ('note', 'capture', 'dictee', 'lien', 'tache')),
  attachment_path text,
  source_url text,
  pinned boolean not null default false,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('french', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(body, '')), 'B') ||
    setweight(to_tsvector('simple', public.notes_tags_text(tags)), 'A')
  ) stored
);
create index if not exists notes_owner_idx on public.notes (owner_id, updated_at desc);
create index if not exists notes_tags_idx on public.notes using gin (tags);
create index if not exists notes_search_idx on public.notes using gin (search);

alter table public.notes enable row level security;
drop policy if exists "own notes" on public.notes;
create policy "own notes" on public.notes for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- Supertags : couleur et description de chaque tag.
create table if not exists public.note_tags (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text not null default '#E01E1E',
  description text,
  primary key (owner_id, name)
);
alter table public.note_tags enable row level security;
drop policy if exists "own note tags" on public.note_tags;
create policy "own note tags" on public.note_tags for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- Captures d'écran et images : bucket privé, un dossier par personne.
insert into storage.buckets (id, name, public) values ('notes', 'notes', false) on conflict (id) do nothing;

-- Reprise des anciens pense-bêtes du coach (Documents & notes), une fois.
insert into public.notes (owner_id, title, body, tags, kind, done, created_at, updated_at)
select p.coach_id, left(split_part(p.content, E'\n', 1), 120), p.content, array['pense-bete'], case when p.done then 'tache' else 'note' end, p.done, p.created_at, p.updated_at
from public.coach_personal_notes p
where not exists (select 1 from public.notes n where n.owner_id = p.coach_id and n.created_at = p.created_at and n.body = p.content);

notify pgrst, 'reload schema';
