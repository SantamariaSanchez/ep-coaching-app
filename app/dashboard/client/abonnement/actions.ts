"use server";

import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";
import { cleanText, LIMITS } from "@/lib/sanitize";
import { revalidatePath } from "next/cache";

// Item 45 : un membre rejoint la liste d'attente de SON coach assigné
// (profile.coach_id) — jamais celle d'un autre coach de la plateforme, pas
// de coachId passé en paramètre pour éviter tout détournement.
export async function joinWaitlist(note: string): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("coach_id, full_name")
    .eq("id", guard.userId)
    .maybeSingle();
  const coachId = (profile as { coach_id: string | null } | null)?.coach_id;
  if (!coachId) return { error: "Aucun coach associé à ton compte." };

  const { error } = await admin
    .from("coaching_waitlist")
    .upsert(
      { coach_id: coachId, member_id: guard.userId, note: cleanText(note, LIMITS.shortText) },
      { onConflict: "coach_id,member_id", ignoreDuplicates: false }
    );
  if (error) return { error: "Erreur lors de l'inscription à la liste d'attente." };

  const fullName = (profile as { full_name: string | null } | null)?.full_name ?? "Un membre";
  notifyUser(coachId, {
    type: "waitlist_join",
    title: "📋 Nouvelle demande sur ta liste d'attente",
    body: `${fullName} veut rejoindre ton coaching dès qu'une place se libère.`,
    url: "/dashboard/coach/communaute/membres",
    senderId: guard.userId,
  }).catch(() => {});

  revalidatePath("/dashboard/client/abonnement");
  return { success: true };
}
