"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth-guards";
import { checkWeightObjectiveAchievements } from "@/utils/roadmap";
import { isWithinBilanBackfillWindow, BILAN_BACKFILL_DAYS } from "@/lib/dates";

function num(v: FormDataEntryValue | null): number | null {
  if (!v || v === "") return null;
  const n = parseFloat(v as string);
  return isNaN(n) ? null : n;
}

function txt(v: FormDataEntryValue | null): string | null {
  const s = (v as string | null)?.trim();
  return s || null;
}

export async function upsertCoachDailyLog(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    // requireCoach() remplace le contrôle de rôle maison et ajoute la force
    // de session (2FA) — l'écriture passe ensuite par le client admin.
    const guard = await requireCoach();
    if (!guard.ok) return { error: guard.error };

    const log_date = formData.get("log_date") as string;
    if (!log_date) return { error: "Date manquante." };

    // Fenêtre de rattrapage 30 jours (2026-08-17), même correctif que
    // app/dashboard/client/bilan/actions.ts — voir lib/dates.ts.
    if (!isWithinBilanBackfillWindow(log_date)) {
      return { error: `Tu ne peux compléter qu'un bilan des ${BILAN_BACKFILL_DAYS} derniers jours.` };
    }

    const supabase = createAdminClient();

    const weightMorning = num(formData.get("weight_morning"));

    // Écriture partielle : seuls les champs réellement présents dans le
    // formData sont inclus dans le payload — sans ça, chaque carte de
    // DailyBilanForm (une par <form> indépendant) écrasait à null tout le
    // reste du bilan du jour à chaque sauvegarde, puisque cette action
    // écrivait TOUS les champs même absents de la soumission en cours. Même
    // correctif que app/dashboard/client/bilan/actions.ts, jamais appliqué
    // ici jusqu'à l'ajout du bilan en 2 temps (MASTERCLASS.md).
    const FIELD_SPEC: Array<{ key: string; kind: "num" | "txt" }> = [
      { key: "training_name", kind: "txt" },
      { key: "cardio", kind: "txt" },
      { key: "steps", kind: "num" },
      { key: "weight_morning", kind: "num" },
      { key: "weight_time", kind: "txt" },
      { key: "sleep_hours", kind: "num" },
      { key: "sleep_rating", kind: "num" },
      { key: "bedtime_actual", kind: "txt" },
      { key: "wake_time_actual", kind: "txt" },
      { key: "digestion", kind: "txt" },
      { key: "stress", kind: "txt" },
      { key: "proteins_g", kind: "num" },
      { key: "carbs_g", kind: "num" },
      { key: "fats_g", kind: "num" },
      { key: "calories_kcal", kind: "num" },
      { key: "hunger", kind: "txt" },
    ];

    const payload: Record<string, unknown> = {
      client_id: guard.userId,
      log_date,
      updated_at: new Date().toISOString(),
    };
    for (const f of FIELD_SPEC) {
      if (formData.has(f.key)) {
        payload[f.key] = f.kind === "num" ? num(formData.get(f.key)) : txt(formData.get(f.key));
      }
    }

    const { error } = await supabase
      .from("daily_logs")
      .upsert(payload, { onConflict: "client_id,log_date" });

    if (error) return { error: error.message };

    // Voir le même hook côté client dans app/dashboard/client/bilan/actions.ts.
    if (weightMorning != null) {
      checkWeightObjectiveAchievements(guard.userId, weightMorning, log_date).catch(() => {});
    }

    revalidatePath("/dashboard/coach/moi/bilan");
    return { success: true };
  } catch (e) {
    console.error("upsertCoachDailyLog error:", e);
    return { error: "Erreur inattendue." };
  }
}
