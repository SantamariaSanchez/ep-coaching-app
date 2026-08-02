-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — formation_sections avait RLS activé mais aucune policy :
-- toute lecture était silencieusement bloquée pour tout le monde (les
-- "Module" affichés à l'écran ne se chargeaient jamais, contrairement aux
-- "Section" qui elles avaient bien leurs policies). Déjà appliquée en
-- production via MCP le 2026-08-02 — ce fichier trace juste le changement
-- dans l'historique des migrations.
-- ═══════════════════════════════════════════════════════════════════════

create policy "read_sections" on public.formation_sections
  for select using (true);

create policy "coach_manage_sections" on public.formation_sections
  for all using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'coach')
  );
