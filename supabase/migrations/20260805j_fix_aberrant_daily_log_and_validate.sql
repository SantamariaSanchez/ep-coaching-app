-- Deja appliquee en production via le MCP Supabase le 2026-08-05.
--
-- Une seule ligne de bilan quotidien portait des valeurs de saisie de test
-- ("gros pecs de malade", 100 000 000 g de proteines, 258 562 kcal). Elle
-- empechait la validation de deux contraintes de bornes, restees NOT VALID
-- depuis la migration 20260805g : tant qu'elles n'etaient pas validees, tout
-- futur UPDATE sur cette ligne precise aurait ete rejete.
--
-- On corrige les deux valeurs plutot que de supprimer la ligne : le reste du
-- bilan (date, poids, seance, pas) est conserve tel quel.
--   * calories_kcal : 2300, seule autre valeur renseignee par ce client.
--   * proteins_g    : 175, coherent avec 2300 kcal.
update public.daily_logs
   set calories_kcal = 2300,
       proteins_g = 175
 where id = 'ca474958-b552-4a9c-a60e-5390c21122ea';

alter table public.daily_logs validate constraint daily_logs_calories_kcal_range_chk;
alter table public.daily_logs validate constraint daily_logs_proteins_g_range_chk;
