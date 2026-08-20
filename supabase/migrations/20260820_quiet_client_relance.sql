-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Relance auto des clients "silencieux" (Axe 3, VISION.md)
-- Déjà exécutée manuellement en production via le MCP Supabase.
-- ═══════════════════════════════════════════════════════════════════════
-- "Reste à faire" documenté explicitement le 2026-08-14 : l'automatisation
-- avait été volontairement laissée de côté en attendant un retour d'usage
-- sur /dashboard/coach/prioritaires, pour ne pas sur-solliciter des
-- clients qui vont très bien. Repris le 2026-08-20 sur décision directe.
--
-- Cooldown par client (comme last_stagnation_escalation_at déjà en place
-- pour le signal multi-données) — 14 jours, plus long que les 7 jours de
-- la stagnation classique car le signal ici est plus doux (aucune donnée
-- qui cloche, juste une absence de contact humain).

alter table public.profiles
  add column if not exists last_quiet_relance_at timestamptz;
