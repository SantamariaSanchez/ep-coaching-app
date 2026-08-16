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
  created_at: string;
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
      .select("id, owner_id, role_key, full_name, email, phone, status, created_at")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    return (data as JobApplication[]) ?? [];
  } catch {
    return [];
  }
}
