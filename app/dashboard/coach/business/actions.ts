"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

// Checklist business personnelle du coach (Axe 6, VISION.md) — un item par
// ligne (coach_id, item_key), RLS scopée au coach lui-même. Items définis
// en dur dans lib/coach-business.ts, seul l'état coché est persisté ici.
export async function toggleBusinessChecklistItem(
  itemKey: string,
  done: boolean
): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.from("coach_business_checklist").upsert({
      coach_id: guard.userId,
      item_key: itemKey,
      done,
      updated_at: new Date().toISOString(),
    });
    if (error) return { error: "Erreur lors de la sauvegarde." };
    revalidatePath("/dashboard/coach/business");
    return {};
  } catch (e) {
    console.error("toggleBusinessChecklistItem error:", e);
    return { error: "Erreur inattendue." };
  }
}
