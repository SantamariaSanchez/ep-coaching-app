"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { alreadyNotifiedToday, getCoachForClient } from "@/utils/insert-notification";
import { notifyUser } from "@/lib/notify";
import { after } from "next/server";
import { awardPoints, POINTS } from "@/lib/gamification";
import { checkWeightObjectiveAchievements } from "@/utils/roadmap";
import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth-guards";
import { isWithinBilanBackfillWindow, BILAN_BACKFILL_DAYS } from "@/lib/dates";
import { celebrateFirstAction } from "@/lib/first-action-celebration";
import { afterBilanSaved } from "@/lib/nutrition-sync";

// Forme du jour (2026-09-30) : bornes identiques aux contraintes SQL
// (migration 20260930c), une valeur hors bornes est ignorée.
const FORME_RANGES: Record<string, [number, number]> = {
  energy: [1, 5],
  mood: [1, 5],
  soreness: [1, 5],
  water_l: [0, 15],
  resting_hr: [25, 220],
  hrv: [5, 300],
  // Une faute de frappe (« 7 » au lieu de « 77 ») passait et pouvait marquer
  // un objectif de poids « atteint » pour de bon : valeur ignorée.
  weight_morning: [25, 350],
  steps: [0, 150000],
  sleep_hours: [0, 24],
};

// Champs entiers en base : une saisie à virgule faisait échouer tout le bilan.
const INTEGER_FIELDS = new Set(["steps", "proteins_g", "carbs_g", "fats_g", "calories_kcal"]);

function num(v: FormDataEntryValue | null): number | null {
  if (!v || v === "") return null;
  const n = parseFloat(v as string);
  return isNaN(n) ? null : n;
}

function txt(v: FormDataEntryValue | null): string | null {
  const s = (v as string | null)?.trim();
  return s || null;
}

export async function upsertDailyLog(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    // requireClient() valide l'identité, le rôle ET la force de session
    // (2FA exigée si le compte l'a activée) — indispensable ici, l'écriture
    // se faisant ensuite via le client admin qui court-circuite la RLS.
    const guard = await requireClient();
    if (!guard.ok) return { error: guard.error };

    const log_date = String(formData.get("log_date") ?? "");
    if (!log_date) return { error: "Date manquante." };
    // Format strict AAAA-MM-JJ et vraie date : « 2026-11-018 » visait la même
    // journée en base mais une autre clé de points (points en double).
    const [ly, lm, ld] = log_date.split("-").map(Number);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(log_date) || new Date(Date.UTC(ly, lm - 1, ld)).toISOString().slice(0, 10) !== log_date) {
      return { error: "Date invalide." };
    }

    // Fenêtre de rattrapage (30 jours, en heure de Paris, voir lib/dates.ts)
    // plutôt qu'une simple tolérance "aujourd'hui ou hier" : la tolérance
    // d'origine (MASTERCLASS Axe L) absorbait un formulaire resté ouvert
    // jusqu'après minuit, celle-ci permet en plus de vraiment rattraper
    // plusieurs jours manqués d'affilée depuis la page Suivi.
    if (!isWithinBilanBackfillWindow(log_date)) {
      return { error: `Tu ne peux compléter qu'un bilan des ${BILAN_BACKFILL_DAYS} derniers jours.` };
    }

    const supabase = createAdminClient();

    // Écriture partielle : seuls les champs réellement présents dans le
    // formData sont inclus dans le payload d'upsert. Supabase ne touche
    // alors que ces colonnes sur ON CONFLICT — un mini-formulaire (ex.
    // juste le poids du matin) ne réinitialise plus le reste du bilan du
    // jour, contrairement à l'ancien comportement qui mettait tout le
    // reste à null dès qu'un seul champ était soumis seul.
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
      { key: "energy", kind: "num" },
      { key: "mood", kind: "num" },
      { key: "soreness", kind: "num" },
      { key: "water_l", kind: "num" },
      { key: "resting_hr", kind: "num" },
      { key: "hrv", kind: "num" },
    ];

    const payload: Record<string, unknown> = {
      client_id: guard.userId,
      log_date,
      updated_at: new Date().toISOString(),
    };
    for (const f of FIELD_SPEC) {
      if (formData.has(f.key)) {
        payload[f.key] = f.kind === "num" ? num(formData.get(f.key)) : txt(formData.get(f.key));
        if (INTEGER_FIELDS.has(f.key) && typeof payload[f.key] === "number") payload[f.key] = Math.round(payload[f.key] as number);
        const range = FORME_RANGES[f.key];
        const v = payload[f.key];
        if (range && typeof v === "number" && (v < range[0] || v > range[1])) payload[f.key] = null;
      }
    }

    // Bilan rapide : « autosave » = enregistrement partiel (sans points ni
    // message au coach) ; l'envoi qui complète le bilan arrive sans ce
    // drapeau et déclenche tout cela.
    const silent = formData.get("autosave") === "1";


    const { error } = await supabase.from("daily_logs").upsert(payload, { onConflict: "client_id,log_date" });

    if (error) {
      console.error("upsertDailyLog error:", error);
      return { error: "Erreur serveur, réessaie." };
    }

    // Calories et macros : le tracker nutrition fait foi (demande directe
    // 2026-09-27, "ça doit pas se faire à la main"). "Diète suivie" remplit
    // d'abord les repas du plan encore vides pour ce jour-là.
    await afterBilanSaved(supabase, guard.userId, log_date, formData.get("diet_followed") === "oui");

    // Le bilan devient la seule saisie manuelle de pas nécessaire (voir
    // StepsClient, qui ne propose plus la sienne) : ce qui est confirmé ici
    // doit rejoindre step_logs, sinon l'historique/les séries de l'onglet
    // Steps se figent dès qu'un jour n'a été renseigné que via le bilan.
    // Écrasement volontaire (pas un max) : le champ steps du bilan est
    // préempli depuis step_logs (voir getTodayStepsActual), donc ce que le
    // client soumet ici est sa réponse finale et confirmée du jour, pas une
    // correction partielle à fusionner.
    const stepsSubmitted = payload.steps as number | null | undefined;
    if (stepsSubmitted != null) {
      // after() : sans lui, la fonction pouvait s'arrêter avant l'écriture.
      after(async () => {
        const { error: stepsError } = await supabase
          .from("step_logs")
          .upsert(
            { client_id: guard.userId, log_date, steps_actual: stepsSubmitted },
            { onConflict: "client_id,log_date" }
          );
        if (stepsError) console.error("bilan->step_logs sync error:", stepsError);
      });
    }

    // Un objectif de road map ("Poids") peut passer "atteint" tout seul dès
    // que ce bilan (même partiel) contient un poids du matin — fire-and-forget, ne doit
    // jamais faire échouer la sauvegarde du bilan.
    const weightLogged = payload.weight_morning as number | null | undefined;
    if (weightLogged != null) {
      after(() => checkWeightObjectiveAchievements(guard.userId, weightLogged, log_date).catch(() => {}));
    }

    if (silent) {
      // Enregistrement volontaire (bouton) : la page se met à jour, sans
      // points ni message au coach tant que le bilan n'est pas complet.
      revalidatePath("/dashboard/client/bilan");
      revalidatePath("/dashboard/client/nutrition");
      revalidatePath("/dashboard/client");
      return { success: true };
    }
    // Premier bilan complet : compté APRÈS l'enregistrement. Les sauvegardes
    // partielles du bilan rapide créent la ligne du jour avant l'envoi final,
    // donc un test « aucune ligne avant » ne voyait jamais le premier bilan.
    // Une seule journée en base et aucun encouragement déjà envoyé.
    const [{ count: days }, { count: already }] = await Promise.all([
      supabase.from("daily_logs").select("log_date", { count: "exact", head: true }).eq("client_id", guard.userId),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", guard.userId).eq("type", "first_daily_bilan"),
    ]);
    const isFirstBilan = (days ?? 0) <= 1 && (already ?? 0) === 0;
    after(() => awardPoints(guard.userId, POINTS.daily_bilan, "Bilan quotidien rempli", "daily_bilan", log_date));

    // Encouragement immédiat au membre lui-même, uniquement la toute
    // première fois (voir lib/first-action-celebration.ts) — jusqu'ici
    // rien n'était envoyé au membre pour son propre premier bilan.
    if (isFirstBilan) {
      after(() => celebrateFirstAction(guard.userId, {
        type: "first_daily_bilan",
        title: "✅ Premier bilan rempli !",
        body: "Poids, sommeil, ressenti : tu viens de poser ta première base. Reviens demain pour voir l'évolution.",
        url: "/dashboard/client/bilan",
      }).catch(() => {}));
    }


    // Coach prévenu (cloche + push) une seule fois par client et par jour :
    // le bilan se remplit souvent en deux fois (matin puis soir), le coach
    // n'a besoin de savoir qu'une chose, que c'est fait. after() : l'envoi
    // n'est jamais coupé par la fin de la requête.
    const clientId = guard.userId;
    after(async () => {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", clientId).maybeSingle();
      const clientName = (profile as { full_name?: string | null } | null)?.full_name ?? "Un client";
      const coach = await getCoachForClient(clientId).catch(() => null);
      if (!coach || coach.id === clientId) return;
      if (await alreadyNotifiedToday(coach.id, "new_daily_log", clientId).catch(() => false)) return;
      await notifyUser(coach.id, {
        type: "new_daily_log",
        title: `✅ ${clientName} a fait son bilan`,
        body: `Bilan du jour rempli (${log_date.split("-").reverse().join("/")}).`,
        url: `/dashboard/coach/clients/${clientId}/bilan`,
        senderId: clientId,
      }).catch(() => {});
    });

    revalidatePath("/dashboard/client/bilan");
    revalidatePath("/dashboard/client/nutrition");
    revalidatePath("/dashboard/coach/moi/nutrition");
    revalidatePath("/dashboard/client");
    revalidatePath("/dashboard/client/aujourdhui");
    return { success: true };
  } catch (e) {
    console.error("upsertDailyLog error:", e);
    return { error: "Erreur inattendue." };
  }
}
