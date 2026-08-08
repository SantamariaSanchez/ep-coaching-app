"use server";

import { requireOwnClientOrSelf } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";
import { revalidatePath } from "next/cache";

// Relance manuelle et immédiate, en plus du cron hebdomadaire automatique
// (voir app/api/cron/weekly-reengagement) — utile quand le coach veut
// relancer une personne précise sans attendre le prochain lundi. Met aussi
// à jour last_reengagement_notified_at pour que le cron ne double pas
// l'envoi cette semaine-là.
export async function relaunchMember(memberId: string): Promise<{ error?: string }> {
  const guard = await requireOwnClientOrSelf(memberId);
  if (!guard.ok) return { error: guard.error };

  await notifyUser(memberId, {
    type: "coach_relaunch",
    title: "👋 Ton coach pense à toi",
    body: "Reviens sur l'appli quand tu veux : ton programme, ta nutrition et la communauté t'attendent.",
    url: "/dashboard/client",
    senderId: guard.userId,
  });

  try {
    const supabase = createAdminClient();
    await supabase
      .from("profiles")
      .update({ last_reengagement_notified_at: new Date().toISOString() })
      .eq("id", memberId);
  } catch {
    // best-effort — la notification est déjà partie, un échec ici ne doit
    // pas faire échouer l'action côté coach
  }

  revalidatePath("/dashboard/coach/communaute/membres");
  return {};
}
