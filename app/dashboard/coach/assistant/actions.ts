"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

// Variante accessible à TOUT coach (pas requirePlatformOwner comme
// app/dashboard/coach/admin/organisation/agents/actions.ts) : cette page
// est le "Mon assistant" personnel de chaque coach, jamais l'écran
// d'administration d'EP Coaching lui-même. RLS + eq("owner_id",
// guard.userId) garantissent qu'un coach ne voit/modifie jamais les
// tâches d'un autre.
export async function markAssistantTaskDone(taskId: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("ai_agent_tasks")
      .update({ status: "fait", updated_at: new Date().toISOString() })
      .eq("id", taskId)
      .eq("owner_id", guard.userId);
    if (error) return { error: "Erreur lors de la mise à jour." };
    revalidatePath("/dashboard/coach/assistant");
    return {};
  } catch (e) {
    console.error("markAssistantTaskDone error:", e);
    return { error: "Erreur inattendue." };
  }
}
