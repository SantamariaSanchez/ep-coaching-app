import { createAdminClient } from "@/lib/supabase-admin";

// Candidatures reçues via /carrieres, voir
// supabase/migrations/20260816a_job_applications.sql pour le schéma et le
// choix de ne jamais insérer via une policy RLS publique.
export const APPLICATION_STATUSES = ["nouvelle", "en_discussion", "refusee", "acceptee"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface JobApplication {
  id: string;
  owner_id: string;
  role_key: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: ApplicationStatus;
  notes: string | null;
  created_at: string;
}

// Les 4 étapes du parcours d'intégration (TIMELINE dans
// app/dashboard/coach/admin/organisation/page.tsx), rendues cochables par
// candidat une fois accepté (supabase/migrations/20260817a_onboarding_
// tracking.sql) — la page Organisation ne se contente plus de décrire le
// parcours en théorie, elle suit une vraie personne dedans.
export const ONBOARDING_STEPS = [
  { key: "decouverte", label: "Découverte", when: "Semaine 1" },
  { key: "pratique_accompagnee", label: "Pratique accompagnée", when: "Semaine 2-3" },
  { key: "autonomie_encadree", label: "Autonomie encadrée", when: "Semaine 4" },
  { key: "evaluation_periode_essai", label: "Évaluation de période d'essai", when: "Mois 3" },
] as const;
export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];

export interface OnboardingStepState {
  step_key: string;
  done: boolean;
}

// Une seule plateforme aujourd'hui (voir profiles.is_platform_owner) : le
// candidat public ne connaît jamais d'identifiant utilisateur, donc l'action
// de candidature a besoin de résoudre elle-même à qui rattacher sa
// candidature avant l'insert.
export async function getPlatformOwnerId(): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("is_platform_owner", true)
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export async function getJobApplications(ownerId: string): Promise<JobApplication[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("job_applications")
      .select("id, owner_id, role_key, full_name, email, phone, status, notes, created_at")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    return (data as JobApplication[]) ?? [];
  } catch {
    return [];
  }
}

// Regroupées par application_id une fois pour toutes (une requête, pas une
// par candidature acceptée) — voir OrganisationView.tsx qui n'en a besoin
// que pour construire la checklist des candidats déjà acceptés.
export async function getOnboardingStepsByApplication(
  applicationIds: string[]
): Promise<Record<string, OnboardingStepState[]>> {
  if (applicationIds.length === 0) return {};
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("onboarding_steps")
      .select("application_id, step_key, done")
      .in("application_id", applicationIds);
    const map: Record<string, OnboardingStepState[]> = {};
    for (const row of (data as { application_id: string; step_key: string; done: boolean }[]) ?? []) {
      if (!map[row.application_id]) map[row.application_id] = [];
      map[row.application_id].push({ step_key: row.step_key, done: row.done });
    }
    return map;
  } catch {
    return {};
  }
}
