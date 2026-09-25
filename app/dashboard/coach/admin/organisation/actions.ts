"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { requirePlatformOwner } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import type { ApplicationStatus } from "@/lib/job-applications";
import { isStaffRoleKey } from "@/lib/staff-roles";
import { cleanText, LIMITS } from "@/lib/sanitize";

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
    // Candidature acceptée = email autorisé à créer son accès sur la page de
    // connexion de son poste (voir app/auth/equipe). Best effort : un échec
    // ici (migration pas encore exécutée) ne bloque pas le changement de
    // statut, l'email reste autorisable à la main.
    if (status === "acceptee") {
      const { data: app } = await supabase
        .from("job_applications")
        .select("id, role_key, email")
        .eq("id", applicationId)
        .eq("owner_id", guard.userId)
        .maybeSingle();
      if (app && isStaffRoleKey(app.role_key)) {
        const admin = createAdminClient();
        await admin.from("staff_invites").upsert(
          {
            owner_id: guard.userId,
            role_key: app.role_key,
            email: String(app.email).trim().toLowerCase(),
            application_id: app.id,
          },
          { onConflict: "role_key,email", ignoreDuplicates: true }
        );
      }
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Autorise un email à créer son accès sur la page de connexion d'un poste,
// pour une personne recrutée hors de la page Carrières.
export async function addStaffInvite(roleKey: string, email: string): Promise<{ error?: string }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };
  if (!isStaffRoleKey(roleKey)) return { error: "Poste inconnu." };
  const clean = cleanText(email, LIMITS.shortText)?.toLowerCase();
  if (!clean || !EMAIL_RE.test(clean)) return { error: "Email invalide." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("staff_invites")
    .upsert({ owner_id: guard.userId, role_key: roleKey, email: clean }, { onConflict: "role_key,email", ignoreDuplicates: true });
  if (error) {
    console.error("addStaffInvite error:", error);
    return { error: "Impossible d'autoriser cet email (migration équipe exécutée ?)." };
  }
  revalidatePath("/dashboard/coach/admin/organisation");
  return {};
}

// Retire une autorisation pas encore utilisée. Une fois l'accès créé, c'est
// setStaffMemberStatus qui s'applique.
export async function revokeStaffInvite(inviteId: string): Promise<{ error?: string }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };
  const admin = createAdminClient();
  const { error } = await admin
    .from("staff_invites")
    .delete()
    .eq("id", inviteId)
    .eq("owner_id", guard.userId)
    .is("used_at", null);
  if (error) return { error: "Suppression impossible." };
  revalidatePath("/dashboard/coach/admin/organisation");
  return {};
}

// Suspend, réactive ou termine l'accès d'un membre de l'équipe. Un accès
// suspendu ou terminé ne voit plus rien : la RLS de staff_records exige
// status = 'actif'.
export async function setStaffMemberStatus(
  userId: string,
  status: "actif" | "suspendu" | "termine"
): Promise<{ error?: string }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };
  if (!["actif", "suspendu", "termine"].includes(status)) return { error: "Statut invalide." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("staff_members")
    .update({ status })
    .eq("user_id", userId)
    .eq("owner_id", guard.userId);
  if (error) return { error: "Modification impossible." };
  revalidatePath("/dashboard/coach/admin/organisation");
  return {};
}
