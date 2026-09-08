"use server";

import { requireOwnClient } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { getMedicalConstraintBySlug } from "@/lib/medical-constraints";
import { revalidatePath } from "next/cache";

// Rattache/détache une fiche de la bibliothèque "Contraintes & populations
// spécifiques" à un client précis — voir client_medical_constraints
// (20260909_client_medical_constraints.sql) et le panneau
// components/ui/ClientMedicalConstraintsPanel.tsx.

export async function toggleClientConstraint(
  clientId: string,
  slug: string,
  active: boolean
): Promise<{ error?: string }> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  // Jamais une chaîne arbitraire : uniquement une des fiches réellement
  // définies dans la bibliothèque, pour ne jamais afficher une étiquette
  // "fantôme" côté fiche client si le slug ne correspond à rien.
  if (!getMedicalConstraintBySlug(slug)) return { error: "Contrainte inconnue." };

  try {
    const admin = createAdminClient();
    if (active) {
      const { error } = await admin
        .from("client_medical_constraints")
        .upsert(
          { client_id: clientId, coach_id: guard.userId, constraint_slug: slug },
          { onConflict: "client_id,constraint_slug", ignoreDuplicates: true }
        );
      if (error) return { error: "Erreur lors de l'ajout." };
    } else {
      await admin
        .from("client_medical_constraints")
        .delete()
        .eq("client_id", clientId)
        .eq("constraint_slug", slug);
    }
    revalidatePath(`/dashboard/coach/clients/${clientId}`);
    return {};
  } catch (e) {
    console.error("toggleClientConstraint error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function addRecoveryLog(
  clientId: string,
  data: { log_date: string; zone: string; load_note: string | null; pain: number; note: string | null }
): Promise<{ error?: string }> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  if (!data.zone.trim()) return { error: "Précise la zone concernée." };
  if (!Number.isFinite(data.pain) || data.pain < 0 || data.pain > 10) {
    return { error: "La douleur doit être entre 0 et 10." };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("client_recovery_logs").insert({
      client_id: clientId,
      coach_id: guard.userId,
      log_date: data.log_date,
      zone: data.zone.trim().slice(0, 200),
      load_note: data.load_note?.trim().slice(0, 300) || null,
      pain: Math.round(data.pain),
      note: data.note?.trim().slice(0, 1000) || null,
    });
    if (error) return { error: "Erreur lors de l'enregistrement." };

    revalidatePath(`/dashboard/coach/clients/${clientId}`);
    return {};
  } catch (e) {
    console.error("addRecoveryLog error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function deleteRecoveryLog(clientId: string, logId: string): Promise<{ error?: string }> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };

  try {
    const admin = createAdminClient();
    await admin.from("client_recovery_logs").delete().eq("id", logId).eq("client_id", clientId);
    revalidatePath(`/dashboard/coach/clients/${clientId}`);
    return {};
  } catch (e) {
    console.error("deleteRecoveryLog error:", e);
    return { error: "Erreur inattendue." };
  }
}
