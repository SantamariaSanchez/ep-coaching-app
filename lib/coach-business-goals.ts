import { createAdminClient } from "@/lib/supabase-admin";
import { getClients } from "@/utils/auth";
import { getCoachFinanceEntries } from "@/lib/coach-finance";

// Objectifs business (Axe 6, passe "masterclass" 2026-09-09) : deux
// familles de métrique se calculent EN DIRECT depuis des données déjà
// réelles dans l'appli (jamais une valeur déclarée à la main qui pourrait
// dériver du réel) — 'clients_actifs' et 'revenu_mois'. 'custom' reste un
// objectif que le coach chiffre et met à jour lui-même (ex. "abonnés
// Instagram", rien d'équivalent n'existe encore dans l'appli).
//
// getCoachBillingInfo (lib/coach-billing.ts) est explicitement réservé à
// l'écran d'admin plateforme (jamais exposé aux coachs eux-mêmes, voir son
// propre commentaire) : le revenu affiché ici vient donc du journal
// déclaratif coach_finance_entries, pas d'un appel Stripe direct.

export type GoalMetricType = "clients_actifs" | "revenu_mois" | "custom";
export type GoalStatus = "active" | "done" | "abandoned";

export interface BusinessGoal {
  id: string;
  coach_id: string;
  title: string;
  metric_type: GoalMetricType;
  unit: string | null;
  target_value: number;
  manual_current_value: number;
  target_date: string | null;
  status: GoalStatus;
  created_at: string;
  completed_at: string | null;
}

export async function getBusinessGoals(coachId: string): Promise<BusinessGoal[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("coach_business_goals")
      .select("id, coach_id, title, metric_type, unit, target_value, manual_current_value, target_date, status, created_at, completed_at")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false });
    return (data as BusinessGoal[]) ?? [];
  } catch {
    return [];
  }
}

/** Nombre de clients au statut d'abonnement actif — même définition que ClientProfileTabs (subscription_status === "active"), la seule utilisée de façon fiable partout ailleurs dans l'appli. */
export async function countActiveClients(coachId: string): Promise<number> {
  const clients = await getClients(coachId);
  return clients.filter((c) => c.subscription_status === "active").length;
}

/** Revenu net (revenus - dépenses) du mois calendaire en cours, depuis le journal déclaratif du coach. */
export async function currentMonthRevenue(coachId: string): Promise<number> {
  const entries = await getCoachFinanceEntries(coachId);
  const monthPrefix = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  return entries
    .filter((e) => e.entry_date.startsWith(monthPrefix))
    .reduce((sum, e) => sum + (e.kind === "revenu" ? e.amount : -e.amount), 0);
}

/** Valeur actuelle d'un objectif, quelle que soit sa métrique — le seul point d'entrée que l'UI doit appeler. */
export async function currentGoalValue(coachId: string, goal: BusinessGoal): Promise<number> {
  if (goal.metric_type === "clients_actifs") return countActiveClients(coachId);
  if (goal.metric_type === "revenu_mois") return currentMonthRevenue(coachId);
  return goal.manual_current_value;
}

/**
 * Même résolution que currentGoalValue, mais synchrone à partir de valeurs
 * déjà calculées une seule fois par la page (activeClientsCount,
 * revenueThisMonth) — évite de refaire un aller-retour DB par objectif
 * "clients_actifs"/"revenu_mois" quand plusieurs objectifs partagent la
 * même métrique.
 */
export function resolveGoalValue(
  goal: BusinessGoal,
  ctx: { activeClientsCount: number; revenueThisMonth: number }
): number {
  if (goal.metric_type === "clients_actifs") return ctx.activeClientsCount;
  if (goal.metric_type === "revenu_mois") return ctx.revenueThisMonth;
  return goal.manual_current_value;
}
