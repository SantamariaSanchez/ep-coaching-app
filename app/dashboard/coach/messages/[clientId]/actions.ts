"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendCoachAgentCheckin } from "@/lib/coach-agent-checkin";
import { revalidatePath } from "next/cache";

// Déclenche une vraie relance par un agent IA interne (demande directe
// 2026-08-19 : "les agents IA doivent... s'occuper des clients"). Ouvert à
// tout coach (pas juste le propriétaire de plateforme, contrairement au
// chat des agents dans Organisation) — c'est un outil de suivi client
// normal, pas une fonctionnalité d'administration business.
export async function triggerAgentCheckin(
  clientId: string,
  agentKey?: string
): Promise<{ error?: string; sent?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  // Un coach tiers ne peut relancer QUE ses propres clients — le
  // fondateur (is_platform_owner) peut relancer n'importe quel membre,
  // même garde que getClientById()/CoachClientMessagesPage.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", guard.userId)
    .maybeSingle();
  if (!profile?.is_platform_owner) {
    const { data: client } = await admin
      .from("profiles")
      .select("coach_id")
      .eq("id", clientId)
      .maybeSingle();
    if (!client || client.coach_id !== guard.userId) {
      return { error: "Ce n'est pas ton client." };
    }
  }

  const result = await sendCoachAgentCheckin(clientId, agentKey);
  if (result.sent) {
    revalidatePath(`/dashboard/coach/messages/${clientId}`);
  }
  return result;
}
