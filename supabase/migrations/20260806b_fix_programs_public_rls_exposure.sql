-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Fix faille critique : programs/program_days/exercises
-- lisibles et modifiables par n'importe qui, sans authentification
-- Deja appliquee en prod via MCP Supabase, ce fichier est pour tracabilite
-- ═══════════════════════════════════════════════════════════════════════
-- Trouvee par un audit de verification independant le 2026-08-06 : ces
-- trois tables portaient chacune une policy "coach full access ..." avec
-- USING (true), FOR ALL, role public, en plus d'une policy correctement
-- scopee (client_id = auth.uid() OR is_own_coach(client_id)). En RLS
-- Postgres les policies permissives d'une meme commande s'additionnent en
-- OR : la policy USING (true) rendait donc la policy restrictive
-- totalement inoperante. Confirme en reproduisant avec la cle anon
-- publique (embarquee dans le bundle JS, aucune session) :
--   GET /rest/v1/programs?select=id,client_id,name,coach_notes -> 200,
--   renvoyait les vrais programmes de vrais clients.
--   GET /rest/v1/exercises?select=id,name,notes -> 200, idem.
-- La meme policy couvrant ALL (SELECT/INSERT/UPDATE/DELETE), un tiers non
-- authentifie pouvait aussi modifier ou supprimer le programme de
-- n'importe quel client.
--
-- Ces policies n'existaient dans aucune migration du repo (creees hors
-- suivi de migrations, probablement heritees d'une version tres
-- anterieure de l'app). program_days/exercises ont deja une policy ALL
-- correctement scopee via la table programs parente ("... via program
-- owner"), qui suffit une fois la policy dangereuse retiree. programs
-- n'avait en revanche pas de policy DELETE scopee explicite (seule la
-- policy "true" couvrait ALL) : on l'ajoute avant de retirer les
-- policies dangereuses pour ne rien casser.
-- ═══════════════════════════════════════════════════════════════════════

drop policy if exists "coach full access programs" on public.programs;
drop policy if exists "coach full access days" on public.program_days;
drop policy if exists "coach full access exercises" on public.exercises;

drop policy if exists "Users delete own programs" on public.programs;
create policy "Users delete own programs" on public.programs
  for delete using (client_id = auth.uid() or is_own_coach(client_id));
