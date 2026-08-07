-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Fix cloisonnement multi-coach sur science_studies
-- Déjà appliquée en prod via MCP Supabase, ce fichier est pour traçabilité
-- ═══════════════════════════════════════════════════════════════════════
-- La policy SELECT était "using (true)" : n'importe quel membre authentifié
-- pouvait lire les études internes (hypothèse/protocole/résultats) de
-- N'IMPORTE QUEL coach de la plateforme, pas seulement le sien. Même classe
-- de faille que celle corrigée sur science_study_participants le
-- 2026-08-06 (migration 20260806d), ici sur le contenu des études
-- lui-même plutôt que sur qui y participe. Non exploitable avec un seul
-- coach en prod aujourd'hui, deviendrait une fuite inter-coachs dès qu'un
-- deuxième coach existera. Trouvé en poursuivant l'audit du 2026-08-06 sur
-- le reste de l'onglet Science, le 2026-08-08.
-- L'app lit déjà via le client admin avec un filtre created_by côté
-- application (utils/science.ts) ; cette policy est la même protection en
-- profondeur au niveau base, au cas où une lecture passe un jour par le
-- client scopé RLS plutôt que l'admin.
-- ═══════════════════════════════════════════════════════════════════════

drop policy if exists "Authenticated members read science studies" on public.science_studies;
create policy "Own coach studies readable" on public.science_studies
  for select using (
    created_by = auth.uid()
    or created_by = (select coach_id from public.profiles where id = auth.uid())
  );
