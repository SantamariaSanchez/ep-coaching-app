import { cache } from "react";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireCoach } from "@/lib/auth-guards";

// Gestion d'équipe ouverte à tous les coachs (demande directe 2026-09-29 :
// "un coach peut avoir une entreprise donc faire des recrutements, qu'il ait
// tous ses outils de management"). Toute la partie équipe (staff_members,
// staff_invites, staff_records, team_messages, staff_documents) est déjà
// rangée par owner_id : un coach n'y voit et n'y gère que SA propre équipe.
//
// Qui peut gérer une équipe : le fondateur, ou un coach qui a choisi
// "Mon entreprise, avec une équipe" (ou l'objectif "recruter et manager")
// dans Mon appli (module equipe explicitement actif).

export const isFounder = cache(async function isFounder(userId: string): Promise<boolean> {
  const { data } = await createAdminClient().from("profiles").select("is_platform_owner").eq("id", userId).maybeSingle();
  return data?.is_platform_owner === true;
});

export const isTeamOwner = cache(async function isTeamOwner(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const [{ data: profile }, { data: setup }] = await Promise.all([
    admin.from("profiles").select("role, is_platform_owner").eq("id", userId).maybeSingle(),
    admin.from("user_app_setup").select("modules").eq("user_id", userId).maybeSingle(),
  ]);
  if (profile?.role !== "coach") return false;
  if (profile.is_platform_owner === true) return true;
  return (setup?.modules as Record<string, unknown> | null)?.equipe === true;
});

/** Garde des actions de gestion d'équipe : coach + équipe activée. */
export async function requireTeamOwner(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return guard;
  if (!(await isTeamOwner(guard.userId))) return { ok: false, error: "Active le mode entreprise dans Mon appli pour gérer une équipe." };
  return { ok: true, userId: guard.userId };
}

/**
 * Le contrat de collaboration signé (JotForm, PDF EP Coaching) ne concerne
 * que l'équipe du fondateur : l'équipe d'un autre coach travaille avec les
 * documents de ce coach (déposés dans ses Documents d'équipe).
 */
export const contractRequiredFor = cache(async function contractRequiredFor(ownerId: string): Promise<boolean> {
  return isFounder(ownerId);
});
