"use server";
import { requireOwnClient } from "@/lib/auth-guards";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

// Activer/désactiver le coaching individuel d'un client manuellement. Le
// webhook Stripe (app/api/webhooks/stripe/route.ts) sait mettre à jour ce
// même champ, mais rien dans l'app ne crée jamais de Checkout Session avec
// le client_reference_id attendu — en pratique un client ne peut donc devenir
// "actif" que si le coach l'active ici lui-même (paiement réglé par ailleurs :
// virement, espèces, lien Stripe envoyé à la main...).
export async function setClientSubscriptionStatus(
  clientId: string,
  status: "free" | "active" | "canceled"
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ subscription_status: status })
    .eq("id", clientId)
    .eq("role", "client");

  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/clients");
  revalidatePath(`/dashboard/coach/clients/${clientId}`);
  revalidatePath("/dashboard/coach/communaute/membres");
  return { success: true };
}
