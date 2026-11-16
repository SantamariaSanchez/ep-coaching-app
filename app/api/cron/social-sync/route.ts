import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { nowInParis, todayInParis } from "@/lib/dates";
import { runSocialSync } from "@/lib/social/sync";
import { mondayOf, saveWeeklyRecap } from "@/lib/social/recap";
import { notifyUser } from "@/lib/notify";
import type { Platform } from "@/lib/social/platforms";

// Synchro des stats réseaux (Windsor -> Supabase), protégée par CRON_SECRET.
//   ?platform=instagram|tiktok|youtube|facebook|linkedin|threads  une seule plateforme
//   ?days=90                                    fenêtre récente (30 minimum)
//   ?backfill=1                                 continue la remontée historique
//   ?auto=1                                     appel du cron hebdo (lundi) :
//     ne tourne que s'il est 6h à Paris (le job est planifié à 4h et 5h UTC
//     pour couvrir l'heure d'été et d'hiver), fait le backfill et le récap.
// La réponse part tout de suite, la synchro continue avec after() dans la
// limite de maxDuration.

export const maxDuration = 300;

const PLATFORMS = ["instagram", "tiktok", "youtube", "facebook", "linkedin", "threads"];

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const platformParam = url.searchParams.get("platform");
  const platform = platformParam && PLATFORMS.includes(platformParam) ? (platformParam as Platform) : null;
  const auto = url.searchParams.get("auto") === "1";
  const days = Math.min(365, Math.max(30, Number(url.searchParams.get("days")) || 30));

  if (auto) {
    const { isoDow, hhmm } = nowInParis();
    if (isoDow !== 1 || Number(hhmm.slice(0, 2)) !== 6) {
      return NextResponse.json({ ok: true, skipped: `pas lundi 6h à Paris (${hhmm})` });
    }
  }
  const backfill = auto || url.searchParams.get("backfill") === "1";

  after(async () => {
    try {
      const res = await runSocialSync({ platform, trigger: auto ? "cron" : backfill ? "backfill" : "cron", days, backfill, budgetMs: 230_000 });
      if (auto) {
        // Récap de la semaine qui vient de se terminer (lundi précédent).
        const admin = createAdminClient();
        const lastMonday = mondayOf(todayInParis());
        const weekStart = new Date(`${lastMonday}T12:00:00Z`);
        weekStart.setUTCDate(weekStart.getUTCDate() - 7);
        const { recap, notionError } = await saveWeeklyRecap(admin, weekStart.toISOString().slice(0, 10));
        const { data: owner } = await admin.from("profiles").select("id").eq("is_platform_owner", true).limit(1).maybeSingle();
        if (owner?.id) {
          await notifyUser(owner.id as string, {
            type: "social_sync",
            title: "Récap réseaux de la semaine prêt",
            body: `${recap.published} publication(s). ${recap.recommendation}`.slice(0, 300) + (notionError ? " (Notion non mis à jour)" : ""),
            url: "/dashboard/coach/admin/stats-reseaux",
          }).catch(() => {});
        }
      }
      console.log("[social-sync]", JSON.stringify(res.results.map((r) => ({ p: r.platform, s: r.status, rows: r.rows }))), "liés:", res.linked);
    } catch (e) {
      console.error("[social-sync] erreur:", e);
    }
  });

  return NextResponse.json({ ok: true, started: true, platform: platform ?? "toutes", days, backfill }, { status: 202 });
}
