"use server";

import { requirePlatformOwner } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { detachClientsFromCoach } from "@/lib/coach-lifecycle";
import { revalidatePath } from "next/cache";

// Filet de sécurité manuel tant que le Payment Link Stripe de l'abonnement
// plateforme n'est pas configuré (voir lib/coach-platform-plan.ts) — même
// logique que setClientSubscriptionStatus pour les clients.
export async function setCoachPlatformStatus(
  coachId: string,
  status: "inactive" | "active" | "canceled"
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ platform_subscription_status: status })
    .eq("id", coachId)
    .eq("role", "coach")
    .eq("is_platform_owner", false);

  if (error) return { error: error.message };

  // Idem qu'un échec de paiement Stripe : jamais de blocage pour les clients
  // d'un coach désactivé, ils repassent membres libres.
  if (status !== "active") {
    await detachClientsFromCoach(coachId);
  }

  revalidatePath("/dashboard/coach/admin");
  return { success: true };
}
