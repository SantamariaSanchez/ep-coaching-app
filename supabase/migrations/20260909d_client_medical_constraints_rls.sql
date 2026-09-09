-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Corrige un trou de sécurité réel : RLS désactivée sur des
-- données de santé (client_medical_constraints, client_recovery_logs)
-- ═══════════════════════════════════════════════════════════════════════
-- La migration 20260909_client_medical_constraints.sql désactivait
-- volontairement RLS sur ces deux tables, en s'appuyant sur "le même parti
-- pris que client_tasks (20260621)". Mais client_tasks a justement été
-- corrigée depuis (20260804c_client_tasks_rls.sql, "RLS Enabled No Policy" /
-- bug fonctionnel réel en prod) : le parti pris cité comme précédent était
-- son ancien état, déjà abandonné. Confirmé par l'audit de sécurité Supabase
-- du 2026-09-09 ("RLS disabled" sur ces deux tables, niveau critique).
--
-- Le raisonnement "l'accès passe uniquement par les server actions" ne
-- protège pas la table elle-même : ces server actions utilisent le client
-- Supabase admin (service role, lib/supabase-admin.ts), qui contourne RLS
-- de toute façon, activée ou non — donc activer RLS ici ne change RIEN à
-- leur fonctionnement (déjà vérifié : lib/client-medical-constraints.ts et
-- app/dashboard/coach/clients/[id]/medical/actions.ts n'utilisent que
-- createAdminClient()). En revanche, tant que RLS reste désactivée,
-- n'importe quel utilisateur connecté (coach ou membre gratuit, pas
-- nécessairement le bon coach) peut interroger ces tables directement via
-- l'API REST Supabase avec son propre jeton, et lire ou modifier les
-- contraintes médicales et le journal de douleur/reprise de N'IMPORTE QUEL
-- client de N'IMPORTE QUEL coach — des données de santé, la pire catégorie
-- possible à exposer ainsi.
--
-- Ni le client ni la personne suivie n'accèdent aujourd'hui à ces tables
-- (aucune lecture côté /dashboard/client) : uniquement le coach propriétaire
-- de la fiche, via is_own_coach() (même fonction que client_tasks). Policy
-- volontairement coach-only, pas de policy client_id = auth.uid() tant
-- qu'aucune vue côté client n'existe réellement.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.client_medical_constraints enable row level security;

drop policy if exists "Coach manages own client medical constraints" on public.client_medical_constraints;
create policy "Coach manages own client medical constraints" on public.client_medical_constraints
  for all using (public.is_own_coach(client_id))
  with check (public.is_own_coach(client_id));

alter table public.client_recovery_logs enable row level security;

drop policy if exists "Coach manages own client recovery logs" on public.client_recovery_logs;
create policy "Coach manages own client recovery logs" on public.client_recovery_logs
  for all using (public.is_own_coach(client_id))
  with check (public.is_own_coach(client_id));
