-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Fix cloisonnement multi-coach sur science_study_participants
-- Deja appliquee en prod via MCP Supabase, ce fichier est pour tracabilite
-- ═══════════════════════════════════════════════════════════════════════
-- is_coach() retourne vrai pour N'IMPORTE QUEL coach, pas seulement celui
-- du participant, ce qui contredit le cloisonnement multi-coach explicite-
-- ment promis dans 20260729b_multi_coach_foundation.sql ("chacun avec ses
-- propres clients, totalement cloisonnes"). Non exploitable aujourd'hui
-- (un seul coach en prod) mais deviendrait une fuite inter coachs des
-- qu'un deuxieme coach existera : un coach concurrent pourrait voir quels
-- clients d'un autre coach ont rejoint quelle etude interne. is_own_coach()
-- est deja le pattern utilise partout ailleurs dans l'app pour ce scoping.
-- Trouve par un audit independant le 2026-08-06.
-- ═══════════════════════════════════════════════════════════════════════

drop policy if exists "Participant or coach reads study participants" on public.science_study_participants;
create policy "Participant or coach reads study participants" on public.science_study_participants
  for select using (participant_id = auth.uid() or is_own_coach(participant_id));
