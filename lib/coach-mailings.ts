import { createAdminClient } from "@/lib/supabase-admin";

// Types/fonctions pures d'audience réexportés pour ne pas casser d'imports
// existants — voir lib/mailing-audience.ts pour pourquoi ils vivent
// séparément (sûr à importer aussi depuis un composant client).
export {
  audienceToStorageKey,
  storageKeyToAudience,
  describeAudience,
  AUDIENCE_LABELS,
  type MailingAudience,
} from "@/lib/mailing-audience";

export interface CoachMailing {
  id: string;
  subject: string;
  // Ajouté en v2 (2026-08-18) : le corps réel de l'envoi, jamais gardé
  // jusqu'ici (seul le sujet l'était) — nécessaire pour dupliquer un envoi
  // passé. Peut être null pour les lignes créées avant ce jour.
  html_content: string | null;
  audience: string;
  scheduled_at: string | null;
  recipient_count: number;
  status: "sent" | "failed" | "scheduled";
  created_at: string;
}

export async function getCoachMailingHistory(coachId: string): Promise<CoachMailing[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("coach_mailings")
      .select("id, subject, html_content, audience, scheduled_at, recipient_count, status, created_at")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data as CoachMailing[]) ?? [];
  } catch {
    return [];
  }
}
