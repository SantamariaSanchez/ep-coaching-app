import "server-only";
import { getClientDailyLogs } from "@/utils/daily-logs";
import { getTodayStepsActual } from "@/utils/steps";
import { getTrackingProfile } from "@/lib/tracking-profile-server";
import { bilanLayout, isWeighDay, nextWeighDayLabel, type BilanField } from "@/lib/tracking-profile";
import { nowInParis, todayInParis } from "@/lib/dates";
import type { AppSetup } from "@/lib/app-setup";
import type { DailyLog } from "@/utils/daily-logs";

// Données de la saisie rapide de l'accueil : les 3 infos du jour selon le
// niveau de suivi (lib/tracking-profile.ts), pré-remplies avec la dernière
// valeur connue. Renvoie null si rien ne doit être demandé.

export interface HomeQuickData {
  today: string;
  existing: DailyLog | null;
  fields: BilanField[];
  minimum: BilanField[];
  isWeighDay: boolean;
  nextWeighLabel: string | null;
  lastWeight: number | null;
  lastSleep: number | null;
  autoSteps: number | null;
  tone: "encourageant" | "neutre" | "technique";
  doneAtLoad: boolean;
  summary: string;
  /** Alimentation en repas cochés, sans chiffres (niveau Simple, relation à l'alimentation). */
  nutritionHabits: boolean;
}

const filledIn = (f: BilanField, l: DailyLog | null): boolean => {
  if (!l) return false;
  switch (f) {
    case "poids": return l.weight_morning != null;
    case "seance": return !!l.training_name;
    case "pas": return l.steps != null;
    case "energie": return l.energy != null;
    case "sommeil": return l.sleep_hours != null;
    default: return true;
  }
};

export async function getHomeQuickData(userId: string, setup: AppSetup): Promise<HomeQuickData | null> {
  try {
    const [tracking, logs, autoSteps] = await Promise.all([getTrackingProfile(userId), getClientDailyLogs(userId, 14), getTodayStepsActual(userId).catch(() => null)]);
    const today = todayInParis();
    const { isoDow } = nowInParis();
    const layout = bilanLayout(tracking, setup.modules);
    const weighToday = isWeighDay(tracking, isoDow);
    const fields = layout.minimum.filter((f) => f !== "poids" || weighToday);
    if (fields.length === 0) return null;
    const existing = logs.find((l) => l.log_date === today) ?? null;
    const done = fields.every((f) => filledIn(f, existing));
    const bits: string[] = [];
    if (existing?.weight_morning != null) bits.push(`${String(existing.weight_morning).replace(".", ",")} kg`);
    if (existing?.energy != null) bits.push(`énergie ${existing.energy}/5`);
    if (existing?.sleep_hours != null) bits.push(`sommeil ${existing.sleep_hours} h`);
    if (existing?.training_name) bits.push(existing.training_name === "Repos" ? "repos" : "séance faite");
    return {
      today,
      existing,
      fields,
      minimum: fields,
      isWeighDay: weighToday,
      nextWeighLabel: nextWeighDayLabel(tracking, isoDow),
      lastWeight: logs.find((l) => l.log_date < today && l.weight_morning != null)?.weight_morning ?? null,
      lastSleep: logs.find((l) => l.log_date < today && l.sleep_hours != null)?.sleep_hours ?? null,
      autoSteps: autoSteps ?? null,
      tone: tracking.tone,
      doneAtLoad: done,
      summary: bits.join(" · "),
      nutritionHabits: tracking.nutrition.detail === "habits",
    };
  } catch {
    return null;
  }
}
