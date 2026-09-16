-- Audit des advisors Supabase (2026-09-16) : la contrainte
-- community_post_reactions_author_id_fkey n'a aucun index couvrant. La clé
-- primaire (post_id, author_id) ne peut pas servir de substitut car author_id
-- n'en est pas la colonne de tête (un index composite ne sert efficacement
-- que par son préfixe). Sans index dédié, toute recherche par auteur (et
-- toute vérification de contrainte FK lors d'une suppression de profil)
-- force un scan complet de la table plutôt qu'une recherche indexée.
create index if not exists idx_community_post_reactions_author
  on public.community_post_reactions (author_id);
