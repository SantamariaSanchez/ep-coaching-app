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

// Réexporté ici pour la même raison : CampaignStats est un simple objet de
// données (pas de secret), sûr à importer dans un composant client comme
// MailingStatsCard.tsx, mais sa définition vit dans lib/brevo-stats.ts
// (qui, lui, appelle l'API Brevo et ne doit jamais finir dans le bundle
// client — voir la même remarque pour wrapBrandedEmail dans
// lib/brevo-mailing.ts). Import type-only : erasé à la compilation, aucun
// risque d'entraîner le reste du fichier avec lui.
export type { CampaignStats } from "@/lib/brevo-stats";
import type { CampaignStats } from "@/lib/brevo-stats";

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
  // Suivi de performance (2026-09-16) : null pour un envoi 1-1 transactionnel
  // (sendSingleMailing, jamais de campagne Brevo créée) ou pour les lignes
  // créées avant cette date.
  brevo_campaign_id: number | null;
  // Dernier snapshot Brevo mis en cache (voir lib/brevo-stats.ts) — null
  // tant que le coach n'a jamais cliqué sur "Rafraîchir les stats".
  stats: CampaignStats | null;
  stats_fetched_at: string | null;
}

interface RawCoachMailingRow {
  id: string;
  subject: string;
  html_content: string | null;
  audience: string;
  scheduled_at: string | null;
  recipient_count: number;
  status: "sent" | "failed" | "scheduled";
  created_at: string;
  brevo_campaign_id: number | null;
  stats_json: CampaignStats | null;
  stats_fetched_at: string | null;
}

const BASE_FIELDS =
  "id, subject, html_content, audience, scheduled_at, recipient_count, status, created_at, brevo_campaign_id";
const FULL_FIELDS = `${BASE_FIELDS}, stats_json, stats_fetched_at`;

function rowToMailing(r: RawCoachMailingRow): CoachMailing {
  return {
    id: r.id,
    subject: r.subject,
    html_content: r.html_content,
    audience: r.audience,
    scheduled_at: r.scheduled_at,
    recipient_count: r.recipient_count,
    status: r.status,
    created_at: r.created_at,
    brevo_campaign_id: r.brevo_campaign_id,
    stats: r.stats_json ?? null,
    stats_fetched_at: r.stats_fetched_at ?? null,
  };
}

export async function getCoachMailingHistory(coachId: string): Promise<CoachMailing[]> {
  const admin = createAdminClient();
  try {
    const { data, error } = await admin
      .from("coach_mailings")
      .select(FULL_FIELDS)
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false })
      .limit(50);
    // La migration 20260916b (ajout de stats_json/stats_fetched_at) est en
    // attente d'exécution manuelle (Supabase SQL Editor, ALTER TABLE refusé
    // par le classificateur de sécurité de l'environnement Claude). Tant
    // qu'elle n'est pas passée, ce select échouait entièrement ("column
    // does not exist") et le catch plus bas renvoyait [] : tout
    // l'historique d'envoi disparaissait silencieusement pour chaque coach,
    // pas seulement les stats. Repli sur les colonnes qui existent déjà
    // pour au moins restaurer l'historique dès maintenant ; les stats
    // réapparaîtront automatiquement, sans autre changement de code, une
    // fois la migration appliquée.
    if (error) throw error;
    return ((data ?? []) as RawCoachMailingRow[]).map(rowToMailing);
  } catch {
    try {
      const { data } = await admin
        .from("coach_mailings")
        .select(BASE_FIELDS)
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false })
        .limit(50);
      return ((data ?? []) as RawCoachMailingRow[]).map(rowToMailing);
    } catch {
      return [];
    }
  }
}
