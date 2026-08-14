"use server";

import { requireAuth } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

// Item 50 : réglage des heures de silence des notifications push. Écrit
// via le client de session (RLS : chacun ne modifie que sa propre ligne
// push_subscriptions), pas le client admin — même précaution que
// /api/push/subscribe.
export async function setQuietHours(
  startHour: number | null,
  endHour: number | null
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  for (const h of [startHour, endHour]) {
    if (h != null && (!Number.isInteger(h) || h < 0 || h > 23)) {
      return { error: "Heure invalide." };
    }
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("push_subscriptions")
    .update({ quiet_hours_start: startHour, quiet_hours_end: endHour })
    .eq("user_id", guard.userId);
  if (error) return { error: "Erreur lors de l'enregistrement." };

  revalidatePath("/dashboard/client/parametres");
  revalidatePath("/dashboard/coach/parametres");
  return { success: true };
}
