-- Landing pages dédiées par campagne (demande explicite 2026-08-16 : "un
-- lien spécifique pour une vidéo TikTok précise, avec son propre message
-- plutôt que la page d'accueil générique"). URL publique /c/[slug], slug
-- unique globalement (pas de scoping par coach dans le chemin, plus court
-- et plus simple à mettre en légende/bio qu'un chemin imbriqué).
create table if not exists public.campaign_pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique,
  headline text not null,
  subheadline text,
  cta_label text not null default 'Rejoindre gratuitement',
  cta_href text not null default '/auth/client',
  view_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaign_pages_owner_idx on public.campaign_pages(owner_id);

alter table public.campaign_pages enable row level security;

-- Gestion (créer/éditer/supprimer/lister ses propres pages) réservée au
-- créateur. La lecture publique de /c/[slug] passe par le client admin
-- côté serveur (visiteur anonyme, même principe que /carrieres), jamais
-- par une policy select publique ici.
create policy "campaign_pages_owner_all" on public.campaign_pages
  for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
