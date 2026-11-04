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
  // La table profiles n'a pas de date de création : l'acceptation des CGU,
  // faite à l'inscription, en tient lieu.
  const coachBase = () => admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "coach").eq("is_platform_owner", false);
  const [{ count: prequal }, { count: signups }, { count: onboarded }, { count: allCoaches }, { data: leadRows }] = await Promise.all([
    admin.from("prequalification_responses").select("id", { count: "exact", head: true }).gte("created_at", since),
    coachBase().gte("terms_accepted_at", since),
    coachBase().not("onboarding_completed_at", "is", null),
    coachBase(),
    admin.from("leads").select("origin_platform").gte("created_at", since).limit(1000),
  ]);
  const leadsByOrigin: Record<string, number> = {};
  for (const r of (leadRows ?? []) as { origin_platform: string | null }[]) {
    const k = r.origin_platform ?? "origine inconnue";
    leadsByOrigin[k] = (leadsByOrigin[k] ?? 0) + 1;
  }
  const d = { prequalifications: prequal ?? 0, coachSignups: signups ?? 0, coachesOnboarded: onboarded ?? 0, coachesTotal: allCoaches ?? 0, leads: leadRows?.length ?? 0, leadsByOrigin };
  return { ...d, summary: inboundSummary(d) };
}
