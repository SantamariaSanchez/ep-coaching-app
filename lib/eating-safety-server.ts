import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";
import { getCoachForClient } from "@/utils/insert-notification";
import {
  eatingCoachAlert,
  eatingSafetyLevel,
  parseEatingRelation,
  type EatingRelation,
  type EatingSafetyLevel,
} from "@/lib/eating-safety";

/** Réponse enregistrée (profiles.eating_relationship), null si jamais posée. */
export async function getEatingRelation(userId: string): Promise<EatingRelation | null> {
  try {
    const { data } = await createAdminClient().from("profiles").select("eating_relationship").eq("id", userId).maybeSingle();
    return parseEatingRelation((data as { eating_relationship?: string | null } | null)?.eating_relationship ?? null);
  } catch {
    return null;
  }
}

/**
 * Enregistre la réponse et, si elle change le niveau, prévient la coach. Un
 * client sans coach n'envoie rien : la protection est de ne pas afficher de
 * déficit (voir NutritionForm), pas de notifier quelqu'un qui n'existe pas.
 */
export async function recordEatingRelation(
  userId: string,
  relation: EatingRelation,
  clientName: string | null
): Promise<EatingSafetyLevel> {
  const admin = createAdminClient();
  const previous = await getEatingRelation(userId);
  await admin.from("profiles").update({ eating_relationship: relation }).eq("id", userId);
  const level = eatingSafetyLevel(relation);
  if (previous === relation) return level;
  const alert = eatingCoachAlert(level, clientName?.trim() || "Un client");
  if (alert) {
    const coach = await getCoachForClient(userId).catch(() => null);
    if (coach && coach.id !== userId) {
      await notifyUser(coach.id, {
        type: "client_eating_signal",
        title: alert.title,
        body: alert.body,
        url: `/dashboard/coach/clients/${userId}`,
        senderId: userId,
      }).catch(() => undefined);
    }
  }
  return level;
}
