-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — RLS manquante sur exercise_corrections
-- Exécute APRÈS 20260729b_multi_coach_foundation.sql (dépend de is_own_coach())
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : exercise_corrections avait sa RLS désactivée depuis la toute
-- première migration (20260602) et n'a jamais été reprise dans la passe de
-- verrouillage RLS ultérieure. N'importe quel utilisateur authentifié —
-- client ou coach, y compris d'un autre coach — pouvait lire l'intégralité
-- des demandes de correction technique de la plateforme.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.exercise_corrections enable row level security;

drop policy if exists "Client and own coach manage corrections" on public.exercise_corrections;
create policy "Client and own coach manage corrections" on public.exercise_corrections
  for all using (client_id = auth.uid() or public.is_own_coach(client_id))
  with check (client_id = auth.uid() or public.is_own_coach(client_id));
