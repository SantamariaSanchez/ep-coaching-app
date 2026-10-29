import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";
import { alreadyNotifiedToday } from "@/utils/insert-notification";
import { hasLivedThisWeek } from "@/lib/lived-content-server";

// Relance hebdomadaire « raconte ta semaine » : le contenu storytelling ne
// vient que du vécu du fondateur (règle du Studio : rien d'inventé). Une fois
// par semaine (vendredi et dimanche soir, voir la migration 20261029b), pour
// les coachs qui font du contenu (au moins un script ou une idée sur 90 jours)
// et qui n'ont encore aucune note #vécu depuis lundi.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const [{ data: scripts }, { data: ideas }] = await Promise.all([
    admin.from("coach_scripts").select("coach_id").gte("created_at", since).limit(2000),
    admin.from("content_ideas").select("coach_id").gte("created_at", since).limit(2000),
  ]);
  const coaches = new Set<string>([...((scripts ?? []) as { coach_id: string }[]), ...((ideas ?? []) as { coach_id: string }[])].map((r) => r.coach_id));

  let notified = 0;
  for (const coachId of coaches) {
    if (await hasLivedThisWeek(coachId)) continue;
    if (await alreadyNotifiedToday(coachId, "lived_weekly_prompt")) continue;
    await notifyUser(coachId, {
      type: "lived_weekly_prompt",
      title: "📝 Qu'est-ce qui s'est passé cette semaine ?",
      body: "1 minute, à la voix ou au texte. C'est ton vécu qui fait tes meilleures histoires.",
      url: "/dashboard/coach/studio",
    });
    notified++;
  }
  return NextResponse.json({ ok: true, notified, coachesChecked: coaches.size });
}
