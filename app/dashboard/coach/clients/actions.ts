"use server";
import { requireOwnClient } from "@/lib/auth-guards";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { startCalibrationPhase, endCoachingPhaseTracking } from "@/lib/coaching-phase";

// Activer/désactiver le coaching individuel d'un client manuellement, avec
// plan/échéance/note optionnels journalisés dans subscription_events. Le
// webhook Stripe (app/api/webhooks/stripe/route.ts) sait mettre à jour ce
// même champ, mais rien dans l'app ne crée jamais de Checkout Session avec
// le client_reference_id attendu — en pratique un client ne peut donc devenir
// "actif" que si le coach l'active ici lui-même (paiement réglé par ailleurs :
// virement, espèces, lien Stripe envoyé à la main...).
export async function setClientSubscriptionStatus(
  clientId: string,
  status: "free" | "active" | "canceled",
  options?: { plan?: string | null; nextBillingDate?: string | null; note?: string | null }
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();

  // Statut avant écriture — nécessaire pour ne déclencher le calibrage que
  // sur une vraie transition vers "active" (pas un simple ré-enregistrement
  // du plan alors que le client est déjà actif).
  const { data: before } = await admin
    .from("profiles")
    .select("subscription_status")
    .eq("id", clientId)
    .maybeSingle();
  const wasActive = before?.subscription_status === "active";

  const { error } = await admin
    .from("profiles")
    .update({
      subscription_status: status,
      ...(options?.plan !== undefined ? { subscription_plan: options.plan } : {}),
      ...(options?.nextBillingDate !== undefined ? { next_billing_date: options.nextBillingDate } : {}),
    })
    .eq("id", clientId);

  if (error) return { error: error.message };

  await admin.from("subscription_events").insert({
    client_id: clientId,
    changed_by: guard.userId,
    status,
    plan: options?.plan ?? null,
    next_billing_date: options?.nextBillingDate || null,
    note: options?.note?.trim() || null,
  });

  // Phase de coaching : jamais pour un membre gratuit, toujours en
  // "calibrage" au tout début d'un coaching payant (voir lib/coaching-phase.ts).
  if (!wasActive && status === "active") {
    await startCalibrationPhase(clientId, guard.userId);
  } else if (wasActive && status !== "active") {
    await endCoachingPhaseTracking(clientId, guard.userId);
  }

  revalidatePath("/dashboard/coach/clients");
  revalidatePath(`/dashboard/coach/clients/${clientId}`);
  revalidatePath(`/dashboard/coach/profile/${clientId}`);
  revalidatePath("/dashboard/coach/communaute/membres");
  return { success: true };
}

export async function getSubscriptionHistory(clientId: string): Promise<
  { id: string; status: string; plan: string | null; next_billing_date: string | null; note: string | null; created_at: string }[]
> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("subscription_events")
    .select("id, status, plan, next_billing_date, note, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(10);

  return data ?? [];
}
