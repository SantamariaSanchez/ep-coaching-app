import { getClientDailyLogs } from "@/utils/daily-logs";
import { getAllClientSessions } from "@/utils/sessions";
import { getNutritionProfile } from "@/utils/nutrition";
import { getClientIntake } from "@/utils/client-intake";
import { getMemberPreferences } from "@/utils/member-preferences";
import { getEatingRelation } from "@/lib/eating-safety-server";
import { clientNudge, computeAdjustments } from "@/lib/coaching-adjustments";
import { ageFromDateOfBirth, levelFromExperience } from "@/lib/plan-generator";
import { todayInParis } from "@/lib/dates";
import ClientNudgeCard from "./ClientNudgeCard";

// Conseil du moment pour le client : au plus une phrase, tirée des mêmes
// règles que la fiche coach (lib/coaching-adjustments.ts), sans action qui
// modifie quoi que ce soit. Silencieux dès que les données manquent.
async function loadNudge(userId: string): Promise<{ id: string; text: string; weekKey: string } | null> {
  try {
    const today = todayInParis();
    const [logs, sessions, nutrition, intake, prefs, eatingRelation] = await Promise.all([
      getClientDailyLogs(userId, 56),
      getAllClientSessions(userId, 10),
      getNutritionProfile(userId),
      getClientIntake(userId),
      getMemberPreferences(userId),
      getEatingRelation(userId),
    ]);
    const target =
      nutrition?.calories_target != null && nutrition.proteins_target != null && nutrition.carbs_target != null && nutrition.fats_target != null
        ? { calories: nutrition.calories_target, proteins: nutrition.proteins_target, carbs: nutrition.carbs_target, fats: nutrition.fats_target }
        : null;
    const all = computeAdjustments({
      today,
      phase: nutrition?.phase ?? null,
      level: levelFromExperience(prefs?.experience_level),
      eatingRelation,
      age: nutrition?.age ?? (intake?.date_of_birth ? ageFromDateOfBirth(intake.date_of_birth) : null),
      target,
      logs,
      sessions,
    });
    const nudge = clientNudge(all);
    if (!nudge) return null;
    const weekKey = `${today.slice(0, 4)}-${Math.floor((Date.parse(today) / 86400000 + 3) / 7)}`;
    return { ...nudge, weekKey };
  } catch {
    return null;
  }
}

export default async function ClientNudge({ userId }: { userId: string }) {
  const nudge = await loadNudge(userId);
  return nudge ? <ClientNudgeCard id={nudge.id} text={nudge.text} weekKey={nudge.weekKey} /> : null;
}
