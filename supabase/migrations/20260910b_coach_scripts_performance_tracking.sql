-- Retour direct (2026-09-10) : "on a quasi 0 tracking de data pour voir
-- si ça fonctionne et du coup savoir réitérer". La page Notion "Reels &
-- Carousels — Suivi Performance" existe déjà mais dépend d'un signalement
-- manuel à Claude, jamais alimentée en pratique. Ces 3 colonnes permettent
-- de loguer la performance directement sur le script publié dans l'app
-- (Studio créatif), sans friction : un seul champ obligatoire (vues), les
-- deux autres optionnels.
alter table public.coach_scripts
  add column if not exists views integer,
  add column if not exists likes integer,
  add column if not exists comments_count integer;
