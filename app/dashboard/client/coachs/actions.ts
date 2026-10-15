"use server";

import { notifyAdmin } from "@/lib/admin-notify";
import { escapeHtml } from "@/lib/sanitize";
import { requireClient } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { maybeSendAICoachWelcome } from "@/lib/ai-coach-welcome";
import { after } from "next/server";

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

  // Fire-and-forget : un coach IA se présente vraiment, jamais bloquant.
  after(() => maybeSendAICoachWelcome(guard.userId, target.id).catch(() => {}));

  // Le fondateur voit en direct qui rejoint quel coach.
  const { data: people } = await admin.from("profiles").select("id, full_name, email, is_ai_coach").in("id", [guard.userId, target.id]);
  const me = people?.find((p) => p.id === guard.userId);
  const coach = people?.find((p) => p.id === target.id);
  void notifyAdmin(`${me?.full_name ?? "Un membre"} a choisi un coach`, [
    `<strong>${escapeHtml(me?.full_name ?? me?.email ?? "Un membre")}</strong> a choisi <strong>${escapeHtml(coach?.full_name ?? "un coach")}</strong>${coach?.is_ai_coach ? " (coach IA)" : ""}`,
  ], { url: "/dashboard/coach/communaute/membres" });

  revalidatePath("/dashboard/client");
  revalidatePath("/dashboard/client/coachs");
  return { success: true };
}
