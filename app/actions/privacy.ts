"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";

// Pendant membre de toggleDirectoryVisible (coach) : se retirer du
// classement communautaire sans cesser de gagner des points. Réservé aux
// comptes client (membres gratuits ET clients accompagnés, le classement
// les réunit tous les deux) ; un coach n'y figure jamais.
export async function setLeaderboardVisible(visible: boolean): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  if (guard.role !== "client") return { error: "Réglage réservé aux membres." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ leaderboard_visible: visible })
    .eq("id", guard.userId);
  if (error) return { error: "Erreur lors de l'enregistrement." };

  revalidatePath("/dashboard/client/parametres");
  revalidatePath("/dashboard/client/communaute/classement");
  return { success: true };
}
