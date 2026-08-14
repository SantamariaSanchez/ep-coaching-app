-- Item 44 (chantier 50 idees) : mur de reussites publiques. Opt-in
-- explicite (defaut false) — une victoire postee dans la communaute privee
-- reste privee tant que l'auteur ne coche pas la case au moment de la
-- publication. Aucun mecanisme retroactif qui rendrait publique une
-- victoire deja postee sans repasser par un choix explicite.
alter table public.community_posts add column if not exists is_public boolean not null default false;

create index if not exists community_posts_public_victories_idx
  on public.community_posts(created_at desc)
  where type = 'victory' and is_public = true;
