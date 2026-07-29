"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 5);
}

// Génère (une fois) le code d'invitation d'un coach — les comptes créés
// avant cette fonctionnalité (dont le propriétaire historique) n'en ont pas
// par défaut.
export async function ensureInviteCode(): Promise<{ error?: string; code?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("invite_code")
    .eq("id", guard.userId)
    .single();
  if (existing?.invite_code) return { code: existing.invite_code };

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const { data, error } = await admin
      .from("profiles")
      .update({ invite_code: code })
      .eq("id", guard.userId)
      .is("invite_code", null)
      .select("invite_code")
      .single();

    if (!error && data) {
      revalidatePath("/dashboard/coach/profile");
      return { code: data.invite_code };
    }
    if (error && !error.message.includes("invite_code")) return { error: error.message };
  }

  return { error: "Erreur lors de la génération du lien." };
}
