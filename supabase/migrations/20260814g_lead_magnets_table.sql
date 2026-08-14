-- Contenu des lead magnets déplacé de lib/lead-magnets.ts (array TS en dur)
-- vers une table : au-delà de quelques dizaines d'entrées, un tableau codé en
-- dur alourdit le bundle JS et ne permet ni recherche, ni filtre, ni
-- pagination côté serveur, ni production autonome par un routine cloud
-- (qui n'a pas accès au dépôt git, seulement à Supabase/PubMed en MCP —
-- donc ne peut structurellement pas écrire dans un fichier .ts).
-- lib/lead-magnets.ts garde exactement les mêmes types exportés, mais lit
-- désormais cette table (voir refactor à suivre).
create table if not exists lead_magnets (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  hook text not null,
  category text not null,
  subcategory text,
  format text not null check (format in ('guide', 'checklist', 'quiz')),
  read_time text not null,
  icon text not null,
  -- Contenu spécifique au format (intro/sections/conclusion pour guide,
  -- intro/groups/conclusion pour checklist, intro/questions/outcomes pour
  -- quiz) : jsonb plutôt que des colonnes dédiées par format, cohérent avec
  -- le typage union discriminé déjà utilisé côté TS (GuideMagnet |
  -- ChecklistMagnet | QuizMagnet).
  content jsonb not null,
  -- Sources PubMed citées dans le contenu (titre, DOI, année) — traçabilité
  -- de la règle « jamais de décision non vérifiée » posée par le coach.
  sources jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Recherche plein texte (titre + accroche) pour l'UX de recherche à
  -- l'échelle : la config 'french' gère les accents/pluriels correctement.
  search_text tsvector generated always as (
    to_tsvector('french', coalesce(title, '') || ' ' || coalesce(hook, ''))
  ) stored
);

create index if not exists lead_magnets_category_idx on lead_magnets (category);
create index if not exists lead_magnets_subcategory_idx on lead_magnets (subcategory);
create index if not exists lead_magnets_format_idx on lead_magnets (format);
create index if not exists lead_magnets_search_idx on lead_magnets using gin (search_text);
create index if not exists lead_magnets_published_created_idx on lead_magnets (published, created_at desc);

alter table lead_magnets enable row level security;

-- Contenu marketing public, comme les LEAD_MAGNETS codés en dur avant eux :
-- lecture publique des entrées publiées, écriture réservée au service role
-- (créées par le coach lui-même ou par la routine cloud de production, pas
-- par un client).
create policy "lead_magnets_public_read" on lead_magnets
  for select using (published = true);

create or replace function set_lead_magnets_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger lead_magnets_set_updated_at
  before update on lead_magnets
  for each row execute function set_lead_magnets_updated_at();
