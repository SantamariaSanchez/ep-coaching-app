import { createAdminClient } from "@/lib/supabase-admin";
import { isMissingTable } from "@/lib/steps-sync";
import type { MealStatus } from "@/lib/diet-day";

// Lecture des cases « mangé » d'un client (table meal_checks, migration
// 20261014h). Module serveur ordinaire, PAS une server action : il prend un
// identifiant de client en paramètre, il ne doit donc jamais être appelable
// depuis le navigateur. Appelé par getMealChecks (la personne connectée) et
// par l'aperçu « Voir comme mon client » après son contrôle d'accès.

export type MealChecks = Record<string, Record<string, MealStatus>>;

export async function readMealChecks(
  clientId: string,
  from: string,
  to: string
): Promise<{ checks: MealChecks; local?: boolean }> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("meal_checks")
      .select("log_date, meal_slot, status")
      .eq("client_id", clientId)
      .gte("log_date", from)
      .lte("log_date", to)
      .limit(500);
    if (error) return { checks: {}, local: isMissingTable(error) };
    const out: MealChecks = {};
    for (const r of (data ?? []) as { log_date: string; meal_slot: string; status: MealStatus }[]) {
      (out[r.log_date] ??= {})[r.meal_slot] = r.status;
    }
    return { checks: out };
  } catch {
    return { checks: {}, local: true };
  }
}
