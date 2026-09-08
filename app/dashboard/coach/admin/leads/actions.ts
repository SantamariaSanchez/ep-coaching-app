"use server";

import { requirePlatformOwner } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import type { LeadStatus } from "@/utils/leads";
import { revalidatePath } from "next/cache";

// Pipeline de suivi manuel des leads (20260909b_leads_pipeline.sql) — voir
// components/coach/LeadsPipeline.tsx. Réservé au propriétaire de la
// plateforme, même garde que la page (les leads sont une donnée
// plateforme, pas rattachée à un coach en particulier).

const VALID_STATUSES: LeadStatus[] = ["nouveau", "contacte", "interesse", "converti", "perdu"];

export async function updateLeadStatus(leadId: string, status: LeadStatus): Promise<{ error?: string }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };

  if (!VALID_STATUSES.includes(status)) return { error: "Statut invalide." };

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("leads")
      .update({ status, status_updated_at: new Date().toISOString() })
      .eq("id", leadId);
    if (error) return { error: "Erreur lors de la mise à jour." };

    revalidatePath("/dashboard/coach/admin/leads");
    return {};
  } catch (e) {
    console.error("updateLeadStatus error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function updateLeadNote(leadId: string, note: string): Promise<{ error?: string }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };

  const trimmed = note.trim();
  if (trimmed.length > 1000) return { error: "Note trop longue (1000 caractères max)." };

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("leads")
      .update({ coach_note: trimmed || null })
      .eq("id", leadId);
    if (error) return { error: "Erreur lors de l'enregistrement." };

    revalidatePath("/dashboard/coach/admin/leads");
    return {};
  } catch (e) {
    console.error("updateLeadNote error:", e);
    return { error: "Erreur inattendue." };
  }
}
