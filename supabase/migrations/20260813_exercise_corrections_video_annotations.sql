-- Item 22 (chantier 50 idees) : annotations video horodatees sur les
-- corrections d'exercice. Tableau de {timestamp_seconds, note} plutot
-- qu'une nouvelle table : ca vit et meurt avec la correction elle-meme,
-- pas de RLS separee a poser, pas de jointure supplementaire a la lecture.
--
-- Deja appliquee manuellement en base via Supabase MCP au moment du
-- chantier (voir PROGRESS.md) : ce fichier documente le changement pour
-- l'historique des migrations, la commande ci-dessous est idempotente si
-- jamais rejouee.
alter table exercise_corrections add column if not exists video_annotations jsonb;
