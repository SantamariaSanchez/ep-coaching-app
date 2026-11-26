import { createAdminClient } from "@/lib/supabase-admin";
import { AUDIT_CLICK_PATH } from "@/lib/source-links";
import { computeBusinessLoop, type LoopMetrics, type LoopReport } from "@/lib/business-loop";

// Chargement des chiffres du circuit (voir lib/business-loop.ts). Une
// requête par maillon, en parallèle ; un maillon illisible vaut 0 plutôt que
// de casser le tableau de bord.

const DAY = 24 * 60 * 60 * 1000;
const VIDEO = ["reel", "youtube"];
const WRITTEN = ["linkedin"];

async function count(q: PromiseLike<{ count: number | null }>): Promise<number> {
  try {
    return (await q).count ?? 0;
  } catch {
    return 0;
  }
}

export async function loadBusinessLoopMetrics(coachId: string): Promise<LoopMetrics> {
  const admin = createAdminClient();
  const since7 = new Date(Date.now() - 7 * DAY).toISOString();
  const since30 = new Date(Date.now() - 30 * DAY).toISOString();

  const { data: clientRows } = await admin
    .from("profiles")
    .select("id")
    .eq("coach_id", coachId)
    .eq("role", "client")
    .eq("status", "active")
    .neq("id", coachId)
    .limit(2000);
  const clientIds = ((clientRows ?? []) as { id: string }[]).map((r) => r.id);

  const distinctClients = async (table: "food_logs" | "workout_logs"): Promise<number> => {
    if (clientIds.length === 0) return 0;
    try {
      const { data } = await admin.from(table).select("client_id").in("client_id", clientIds).gte("created_at", since7).limit(20000);
      return new Set(((data ?? []) as { client_id: string }[]).map((r) => r.client_id)).size;
    } catch {
      return 0;
    }
  };

  const selfFoodDays = async (): Promise<number> => {
    try {
      const { data } = await admin.from("food_logs").select("logged_at").eq("client_id", coachId).gte("created_at", since7).limit(2000);
      return new Set(((data ?? []) as { logged_at: string | null }[]).map((r) => String(r.logged_at ?? "").slice(0, 10)).filter(Boolean)).size;
    } catch {
      return 0;
    }
  };

  const lastCapture = async (): Promise<number | null> => {
    try {
      const [{ data: post }, { data: day }] = await Promise.all([
        admin.from("social_post_metrics").select("snapshot_date").order("snapshot_date", { ascending: false }).limit(1).maybeSingle(),
        admin.from("social_account_daily").select("date").order("date", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const dates = [post?.snapshot_date, day?.date].filter(Boolean) as string[];
      if (dates.length === 0) return null;
      const last = dates.sort().pop() as string;
      return Math.max(0, Math.floor((Date.now() - new Date(`${last}T12:00:00Z`).getTime()) / DAY));
    } catch {
      return null;
    }
  };

  const [
    videoStock,
    videoShotWaiting,
    videoPublished7d,
    writtenStock,
    writtenPublished7d,
    daysSinceStatsCapture,
    guideClicks7d,
    leads7d,
    auditClicks7d,
    calls30d,
    clientsLoggingFood7d,
    clientsTraining7d,
    selfFood,
    selfSessions7d,
  ] = await Promise.all([
    count(admin.from("coach_scripts").select("id", { count: "exact", head: true }).eq("coach_id", coachId).eq("status", "a_tourner").in("platform", VIDEO)),
    count(admin.from("coach_scripts").select("id", { count: "exact", head: true }).eq("coach_id", coachId).eq("status", "tourne").in("platform", VIDEO)),
    count(admin.from("content_published_log").select("id", { count: "exact", head: true }).eq("coach_id", coachId).in("platform", VIDEO).gte("published_at", since7)),
    count(admin.from("coach_scripts").select("id", { count: "exact", head: true }).eq("coach_id", coachId).eq("status", "a_tourner").in("platform", WRITTEN)),
    count(admin.from("content_published_log").select("id", { count: "exact", head: true }).eq("coach_id", coachId).in("platform", WRITTEN).gte("published_at", since7)),
    lastCapture(),
    count(admin.from("page_visits").select("id", { count: "exact", head: true }).like("path", "/g/%").gte("created_at", since7)),
    count(admin.from("leads").select("id", { count: "exact", head: true }).gte("created_at", since7)),
    count(admin.from("page_visits").select("id", { count: "exact", head: true }).eq("path", AUDIT_CLICK_PATH).gte("created_at", since7)),
    count(admin.from("sales_calls").select("id", { count: "exact", head: true }).eq("coach_id", coachId).gte("call_date", since30.slice(0, 10))),
    distinctClients("food_logs"),
    distinctClients("workout_logs"),
    selfFoodDays(),
    count(admin.from("sessions").select("id", { count: "exact", head: true }).eq("client_id", coachId).eq("is_completed", true).gte("created_at", since7)),
  ]);

  return {
    videoStock,
    videoShotWaiting,
    videoPublished7d,
    writtenStock,
    writtenPublished7d,
    daysSinceStatsCapture,
    guideClicks7d,
    leads7d,
    auditClicks7d,
    calls30d,
    activeClients: clientIds.length,
    clientsLoggingFood7d,
    clientsTraining7d,
    selfFoodDays7d: selfFood,
    selfSessions7d,
  };
}

export async function loadBusinessLoop(coachId: string): Promise<LoopReport> {
  return computeBusinessLoop(await loadBusinessLoopMetrics(coachId));
}
