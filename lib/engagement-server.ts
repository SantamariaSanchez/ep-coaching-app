import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  DEFAULT_ENGAGEMENT_MONTHS,
  clampEngagementMonths,
  engagementEndDate,
  engagementProgress,
  type EngagementProgress,
  type EngagementRow,
  type RenewalStatus,
} from "@/lib/engagement";
import { isValidIsoDate } from "@/lib/roadmap-weeks";
import { todayInParis } from "@/lib/dates";

const COLUMNS = "client_id, duration_months, start_date, end_date, review_notified_at, renewal_status, note";

/** Engagement d'un client (le client lit le sien, le coach ceux de ses clients, via la RLS). Null si la table n'existe pas encore ou aucune fiche. */
export async function getEngagement(clientId: string): Promise<EngagementRow | null> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase.from("client_engagements").select(COLUMNS).eq("client_id", clientId).maybeSingle();
    return (data as EngagementRow | null) ?? null;
  } catch {
    return null;
  }
}

export async function getEngagementProgress(clientId: string): Promise<(EngagementProgress & { startDate: string; endDate: string }) | null> {
  const row = await getEngagement(clientId);
  if (!row) return null;
  return { ...engagementProgress(row.start_date, row.end_date, todayInParis()), startDate: row.start_date, endDate: row.end_date };
}

/**
 * Ouvre l'engagement de 6 mois à l'activation du coaching. Idempotent : un
 * engagement encore en cours n'est jamais écrasé ; un engagement terminé
 * (réactivation après une pause) repart d'aujourd'hui.
 */
export async function startEngagement(clientId: string, changedBy: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const today = todayInParis();
    const { data: existing } = await admin.from("client_engagements").select("end_date").eq("client_id", clientId).maybeSingle();
    if (existing && (existing.end_date as string) >= today) return;
    await admin.from("client_engagements").upsert(
      {
        client_id: clientId,
        duration_months: DEFAULT_ENGAGEMENT_MONTHS,
        start_date: today,
        end_date: engagementEndDate(today, DEFAULT_ENGAGEMENT_MONTHS),
        review_notified_at: null,
        renewal_status: null,
        updated_by: changedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id" }
    );
  } catch {
    // La migration 20261028 n'est peut-être pas encore passée : jamais bloquant pour l'activation.
  }
}

export async function saveEngagement(
  clientId: string,
  changedBy: string,
  input: { months: number; startDate: string; renewalStatus?: RenewalStatus | null; note?: string | null }
): Promise<{ error?: string }> {
  if (!isValidIsoDate(input.startDate)) return { error: "Date de début invalide." };
  const months = clampEngagementMonths(input.months);
  const admin = createAdminClient();
  const { data: before } = await admin.from("client_engagements").select("start_date, duration_months").eq("client_id", clientId).maybeSingle();
  const patch: Record<string, unknown> = {
    client_id: clientId,
    duration_months: months,
    start_date: input.startDate,
    end_date: engagementEndDate(input.startDate, months),
    updated_by: changedBy,
    updated_at: new Date().toISOString(),
  };
  // Nouvelle échéance : le bilan doit pouvoir être re-déclenché.
  if (!before || before.start_date !== input.startDate || before.duration_months !== months) patch.review_notified_at = null;
  if (input.renewalStatus !== undefined) patch.renewal_status = input.renewalStatus;
  if (input.note !== undefined) patch.note = input.note?.trim() || null;
  const { error } = await admin.from("client_engagements").upsert(patch, { onConflict: "client_id" });
  return error ? { error: error.message } : {};
}
