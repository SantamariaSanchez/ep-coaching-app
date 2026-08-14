-- MASTERCLASS.md Axe I : le linter de securite Supabase (get_advisors)
-- signale que cette fonction trigger n'a pas de search_path fixe
-- (function_search_path_mutable), contrairement a toutes ses fonctions
-- soeurs du projet (is_coach, is_own_coach, etc.) qui l'ont deja.
-- Durcissement pur, aucun changement de comportement.
--
-- Deja appliquee en production via le MCP Supabase le 2026-08-14.

alter function public.set_lead_magnets_updated_at() set search_path = public;
