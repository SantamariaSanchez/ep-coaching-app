-- EP Coaching — Section "Science" (Recherche / Actualité / Bibliothèque / Nos études)
-- Source principale : PubMed (NCBI). `science_articles` sert à la fois de
-- bibliothèque permanente (toutes les lignes) et de flux actualité
-- (is_actualite = true), pour éviter de dupliquer le contenu entre les deux
-- onglets. `science_studies` est le futur espace pour les études internes
-- menées par le coach à l'échelle de sa communauté.

create table if not exists public.science_articles (
  id uuid primary key default gen_random_uuid(),
  pmid text not null unique,
  doi text,
  title text not null,
  abstract text,
  authors text,
  journal text,
  pub_date date,
  article_type text check (article_type in ('meta_analyse', 'revue_systematique', 'essai_clinique', 'etude_observationnelle', 'autre')),
  topic text not null,
  summary_fr text,
  url text not null,
  pmc_id text,
  is_actualite boolean not null default false,
  is_auto boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_science_articles_pub_date on public.science_articles (pub_date desc);
create index if not exists idx_science_articles_topic on public.science_articles (topic);
create index if not exists idx_science_articles_actualite on public.science_articles (is_actualite) where is_actualite = true;

-- App privée coach/client, pas besoin de RLS strict (cohérent avec le reste du schéma).
alter table if exists public.science_articles disable row level security;

create table if not exists public.science_studies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  hypothesis text,
  protocol text,
  status text not null default 'idee' check (status in ('idee', 'en_cours', 'terminee')),
  participant_count integer,
  start_date date,
  end_date date,
  results text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_science_studies_status on public.science_studies (status);

alter table if exists public.science_studies disable row level security;
