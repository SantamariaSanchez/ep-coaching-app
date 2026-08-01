"use server";

import { requireClient } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

// Un membre sans coach (orphelin après désactivation de son coach, ou ayant
// volontairement quitté le sien) peut en choisir un nouveau parmi les coachs
// tiers actifs de la plateforme. Ne fonctionne que tant qu'il n'a pas déjà
// de coach — le changement "à chaud" passe par une action dédiée côté coach.
export async function chooseNewCoach(coachId: string): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();

  const { data: current } = await admin
    .from("profiles")
    .select("coach_id")
    .eq("id", guard.userId)
    .single();
  if (current?.coach_id) return { error: "Tu as déjà un coach." };

  const { data: target } = await admin
    .from("profiles")
    .select("id")
    .eq("id", coachId)
    .eq("role", "coach")
    .eq("is_platform_owner", false)
    .eq("platform_subscription_status", "active")
    .maybeSingle();
  if (!target) return { error: "Ce coach n'est plus disponible." };

  const { error } = await admin
    .from("profiles")
    .update({ coach_id: target.id })
    .eq("id", guard.userId);
  if (error) return { error: "Erreur lors du rattachement." };

  revalidatePath("/dashboard/client");
  revalidatePath("/dashboard/client/coachs");
  return { success: true };
}
