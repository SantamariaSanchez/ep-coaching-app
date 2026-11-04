import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { todayInParis } from "@/lib/dates";
import { inboundSummary, type InboundDemand } from "@/lib/social/inbound-summary";

// Demandes réellement reçues (C58, 04/11/2026) : séparer la visibilité (vues,
// portée) de l'intérêt réel (questionnaires remplis, coachs inscrits). Réservé
// au fondateur : ces chiffres concernent le parcours EP Coaching, pas celui
// d'un coach tiers.

const shift = (d: string, days: number) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + days);
  return x.toISOString().slice(0, 10);
};

export async function getInboundDemand(userId: string): Promise<(InboundDemand & { summary: string }) | null> {
  const admin = createAdminClient();
  const { data: me } = await admin.from("profiles").select("is_platform_owner").eq("id", userId).maybeSingle();
  if (!(me as { is_platform_owner?: boolean | null } | null)?.is_platform_owner) return null;
  const since = `${shift(todayInParis(), -30)}T00:00:00Z`;
  const [{ count: prequal }, { count: coaches }] = await Promise.all([
    admin.from("prequalification_responses").select("id", { count: "exact", head: true }).gte("created_at", since),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "coach").eq("is_platform_owner", false).gte("created_at", since),
  ]);
  const d = { prequalifications: prequal ?? 0, coachSignups: coaches ?? 0 };
  return { ...d, summary: inboundSummary(d) };
}
