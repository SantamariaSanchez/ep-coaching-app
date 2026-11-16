-- Visites des pages publiques (chantier C64) : page, site d'origine, source
-- utm, date. Aucune IP, aucun identifiant, aucun navigateur. Écrites et lues
-- seulement côté serveur (client admin) : RLS active, aucune policy.
create table if not exists public.page_visits (
  id bigint generated always as identity primary key,
  path text not null check (char_length(path) <= 200),
  referrer_host text check (char_length(referrer_host) <= 100),
  utm_source text check (char_length(utm_source) <= 60),
  created_at timestamptz not null default now()
);
create index if not exists page_visits_created_idx on public.page_visits (created_at desc);
alter table public.page_visits enable row level security;
