-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Tags matériel structurés sur les salles
-- Déjà appliquée en prod via MCP Supabase, ce fichier est pour traçabilité
-- ═══════════════════════════════════════════════════════════════════════
-- Tags matériel structurés par salle, réutilisant la même taxonomie que la
-- classification des exercices (lib/exercise-library-content.ts). Objectif :
-- un filtre réel sur les salles (au-delà de la recherche texte libre) et un
-- croisement "quels exercices sont réalisables ici" par type d'équipement.
-- Défaut vide : pas de valeur devinée sur une salle déjà en base, à
-- renseigner par le coach ou la communauté comme equipment_notes aujourd'hui.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.gyms
  add column if not exists equipment_types text[] not null default '{}';
