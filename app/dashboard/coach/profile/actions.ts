"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { COACH_SPECIALIZATIONS } from "@/lib/coach-specializations";

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

// Un coach peut aussi être suivi comme client par un autre coach (double
// rôle) — rattachement via le même code d'invitation que celui utilisé pour
// les clients classiques (voir /auth/client?coach=CODE).
export async function joinPersonalCoach(
  inviteCode: string
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const code = inviteCode.trim();
  if (!code) return { error: "Code d'invitation requis." };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "coach")
    .eq("invite_code", code)
    .eq("platform_subscription_status", "active")
    .maybeSingle();

  if (!target) return { error: "Code invalide ou coach non actif." };
  if (target.id === guard.userId) return { error: "Tu ne peux pas devenir ton propre client." };

  const { error } = await admin
    .from("profiles")
    .update({ coach_id: target.id })
    .eq("id", guard.userId);
  if (error) return { error: "Erreur lors du rattachement." };

  revalidatePath("/dashboard/coach/profile");
  return { success: true };
}

// Chaque coach tiers facture ses propres clients en dehors de l'appli (pas
// de Stripe Connect) — ce lien lui permet de partager facilement son propre
// moyen de paiement Stripe à ses clients depuis son profil.
export async function updateExternalPaymentLink(
  url: string
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const trimmed = url.trim();
  if (trimmed && !/^https:\/\//.test(trimmed)) {
    return { error: "Le lien doit commencer par https://" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ external_payment_link: trimmed || null })
    .eq("id", guard.userId);
  if (error) return { error: "Erreur lors de l'enregistrement." };

  revalidatePath("/dashboard/coach/profile");
  return { success: true };
}

// Item 45 : quand le coach est à capacité, désactive le CTA de réservation
// classique côté membres non-clients au profit d'une liste d'attente.
export async function toggleAcceptingNewClients(accepting: boolean): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ accepting_new_clients: accepting })
    .eq("id", guard.userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/profile");
  return { success: true };
}

// Axe FP (MASTERCLASS.md, audit Paramètres 2026-09-23) : se retirer de
// l'annuaire public sans toucher accepting_new_clients (sens différent).
// Revalide /coachs, la page publique qui lit ce champ (voir coach-directory.ts).
export async function toggleDirectoryVisible(visible: boolean): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ directory_visible: visible })
    .eq("id", guard.userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/parametres");
  revalidatePath("/coachs");
  return { success: true };
}

// Axe 5 (VISION.md) : étiquettes de spécialisation affichées dans
// l'annuaire public /coachs. On revalide aussi /coachs pour que le
// changement soit visible immédiatement (page dynamique, pas d'ISR ici).
export async function updateSpecializations(specializations: string[]): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const cleaned = [...new Set(specializations)].filter((s) =>
    (COACH_SPECIALIZATIONS as readonly string[]).includes(s)
  );

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ specializations: cleaned })
    .eq("id", guard.userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/profile");
  revalidatePath("/dashboard/coach/parametres");
  revalidatePath("/coachs");
  return { success: true };
}

export async function markWaitlistContacted(entryId: string): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("coaching_waitlist")
    .update({ contacted_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("coach_id", guard.userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/communaute/membres");
  return { success: true };
}

export async function leavePersonalCoach(): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ coach_id: null, subscription_status: "free" })
    .eq("id", guard.userId);
  if (error) return { error: "Erreur lors du retrait." };

  revalidatePath("/dashboard/coach/profile");
  return { success: true };
}
