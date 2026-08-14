"use server";

import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

function generateReferralCode(): string {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 5);
}

// Item 41 : génère (une fois) le code de parrainage personnel de
// n'importe quel utilisateur connecté — même mécanisme que
// ensureInviteCode (app/dashboard/coach/profile/actions.ts), mais pas
// réservé aux coachs et sur une colonne dédiée (voir la migration
// 20260814_referral_program.sql pour le pourquoi).
export async function ensureReferralCode(): Promise<{ error?: string; code?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("referral_code")
    .eq("id", guard.userId)
    .single();
  if (existing?.referral_code) return { code: existing.referral_code };

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode();
    const { data, error } = await admin
      .from("profiles")
      .update({ referral_code: code })
      .eq("id", guard.userId)
      .is("referral_code", null)
      .select("referral_code")
      .single();

    if (!error && data) {
      revalidatePath("/dashboard/client/profile");
      return { code: data.referral_code };
    }
    if (error && !error.message.includes("referral_code")) return { error: error.message };
  }

  return { error: "Erreur lors de la génération du lien." };
}
