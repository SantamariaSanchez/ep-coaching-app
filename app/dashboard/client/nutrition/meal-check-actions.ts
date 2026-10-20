"use server";

import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { isWithinBilanBackfillWindow } from "@/lib/dates";
import { isMissingTable } from "@/lib/steps-sync";
import type { MealStatus } from "@/lib/diet-day";
import { readMealChecks, type MealChecks } from "@/lib/meal-checks";

// Cases « mangé » de la diète (migration 20261014h_meal_checks). Tolérant :
// tant que la table n'existe pas, `local: true` indique au navigateur de
// garder ses cases sur l'appareil, sans erreur affichée.

const STATUSES: MealStatus[] = ["mange", "remplace", "ecart", "saute"];
const SLOT_RE = /^[a-z_]{1,40}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type { MealChecks };

export async function getMealChecks(from: string, to: string): Promise<{ checks: MealChecks; local?: boolean }> {
  const guard = await requireAuth();
  if (!guard.ok || !DATE_RE.test(from) || !DATE_RE.test(to)) return { checks: {} };
  return readMealChecks(guard.userId, from, to);
}

/** Coche (ou décoche avec status null) un repas pour un jour. */
export async function setMealCheck(date: string, slot: string, status: MealStatus | null): Promise<{ error?: string; local?: boolean }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  if (!DATE_RE.test(date) || !isWithinBilanBackfillWindow(date)) return { error: "Date invalide." };
  if (!SLOT_RE.test(slot)) return { error: "Repas invalide." };
  if (status !== null && !STATUSES.includes(status)) return { error: "Statut invalide." };
  try {
    const admin = createAdminClient();
    const res = status
      ? await admin
          .from("meal_checks")
          .upsert({ client_id: guard.userId, log_date: date, meal_slot: slot, status, updated_at: new Date().toISOString() }, { onConflict: "client_id,log_date,meal_slot" })
      : await admin.from("meal_checks").delete().eq("client_id", guard.userId).eq("log_date", date).eq("meal_slot", slot);
    if (res.error) {
      if (isMissingTable(res.error)) return { local: true };
      console.error("setMealCheck error:", res.error);
      return { error: "Case non enregistrée, réessaie." };
    }
    return {};
  } catch (e) {
    console.error("setMealCheck error:", e);
    return { error: "Connexion perdue, réessaie." };
  }
}
