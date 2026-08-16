"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { requirePlatformOwner } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import type { ApplicationStatus } from "@/lib/job-applications";

export type RoleStatus = "a_pourvoir" | "en_recrutement" | "pourvu";

// Seule vraie fonctionnalité de la page Organisation (le reste est du
// contenu de référence statique) : marquer où en est le recrutement de
// chaque poste. Table org_role_status, clé (owner_id, role_key) — voir
// supabase/migrations/20260815g_org_role_status.sql.
export async function setRoleStatus(
  roleKey: string,
  status: RoleStatus
): Promise<{ error?: string }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.from("org_role_status").upsert(
      {
        owner_id: guard.userId,
        role_key: roleKey,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id,role_key" }
    );
    if (error) {
      console.error("setRoleStatus error:", error);
      return { error: "Erreur lors de la sauvegarde." };
    }
    revalidatePath("/dashboard/coach/admin/organisation");
    return {};
  } catch (e) {
    console.error("setRoleStatus error:", e);
    return { error: "Erreur inattendue." };
  }
}

// Fait avancer une candidature reçue via /carrieres (voir
// lib/job-applications.ts). La RLS sur job_applications borne déjà la
// visibilité/écriture à owner_id = auth.uid(), le guard applicatif reste la
// même protection que le reste de cette page (réservée au fondateur).
export async function setApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
): Promise<{ error?: string }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("job_applications")
      .update({ status })
      .eq("id", applicationId)
      .eq("owner_id", guard.userId);
    if (error) {
      console.error("setApplicationStatus error:", error);
      return { error: "Erreur lors de la sauvegarde." };
    }
    revalidatePath("/dashboard/coach/admin/organisation");
    return {};
  } catch (e) {
    console.error("setApplicationStatus error:", e);
    return { error: "Erreur inattendue." };
  }
}

// Notes libres par candidature (2026-08-17, "je veux une entreprise pas
// juste ce qu'il y a") — un recrutement réel s'accompagne de notes
// d'entretien, pas seulement d'un statut binaire.
export async function setApplicationNotes(
  applicationId: string,
  notes: string
): Promise<{ error?: string }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("job_applications")
      .update({ notes: notes.trim() || null })
      .eq("id", applicationId)
      .eq("owner_id", guard.userId);
    if (error) {
      console.error("setApplicationNotes error:", error);
      return { error: "Erreur lors de la sauvegarde." };
    }
    revalidatePath("/dashboard/coach/admin/organisation");
    return {};
  } catch (e) {
    console.error("setApplicationNotes error:", e);
    return { error: "Erreur inattendue." };
  }
}

// Coche/décoche une étape du parcours d'intégration pour un candidat
// accepté (voir lib/job-applications.ts::ONBOARDING_STEPS). La RLS sur
// onboarding_steps passe par job_applications.owner_id, mais on revérifie
// quand même ici que la candidature appartient bien au fondateur avant
// d'upsert, pour un message d'erreur clair plutôt qu'un échec RLS muet.
export async function toggleOnboardingStep(
  applicationId: string,
  stepKey: string,
  done: boolean
): Promise<{ error?: string }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { data: application } = await supabase
      .from("job_applications")
      .select("id")
      .eq("id", applicationId)
      .eq("owner_id", guard.userId)
      .maybeSingle();
    if (!application) return { error: "Candidature introuvable." };

    const { error } = await supabase.from("onboarding_steps").upsert(
      {
        application_id: applicationId,
        step_key: stepKey,
        done,
        done_at: done ? new Date().toISOString() : null,
      },
      { onConflict: "application_id,step_key" }
    );
    if (error) {
      console.error("toggleOnboardingStep error:", error);
      return { error: "Erreur lors de la sauvegarde." };
    }
    revalidatePath("/dashboard/coach/admin/organisation");
    return {};
  } catch (e) {
    console.error("toggleOnboardingStep error:", e);
    return { error: "Erreur inattendue." };
  }
}
