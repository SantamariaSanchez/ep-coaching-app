import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser, notifyUsers } from "@/lib/notify";
import { getClients } from "@/utils/auth";
import { LIVE_TYPE_LABELS, isOneToOneType, type LiveType } from "@/lib/live-types";

// Rappelle aux clients concernés qu'un live commence bientôt — déclenché
// toutes les 5 min par Supabase pg_cron (voir
// supabase/migrations/20260712b_live_reminders_cron.sql). reminder_sent_at
// évite les doublons si le cron repasse sur le même événement.
const REMINDER_WINDOW_MINUTES = 15;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);

  const { data: events } = await supabase
    .from("live_events")
    .select("id, title, type, invited_client_id, starts_at, host_id")
    .eq("status", "scheduled")
    .is("reminder_sent_at", null)
    .gte("starts_at", now.toISOString())
    .lte("starts_at", windowEnd.toISOString());

  let reminded = 0;

  for (const event of events ?? []) {
    const minutesUntil = Math.round(
      (new Date(event.starts_at as string).getTime() - now.getTime()) / 60000
    );
    const params = {
      type: "live_reminder",
      title: "⏰ Live dans quelques minutes",
      body: `${event.title} commence dans ${Math.max(minutesUntil, 1)} min`,
      url: "/dashboard/client/live",
    };

    if (isOneToOneType(event.type as LiveType) && event.invited_client_id) {
      await notifyUser(event.invited_client_id as string, params);
    } else {
      // Un webinaire/qna n'est diffusé qu'aux clients DU coach qui l'héberge.
      const clients = await getClients(event.host_id as string);
      await notifyUsers(clients.map((c) => c.id), {
        ...params,
        title: `⏰ ${LIVE_TYPE_LABELS[event.type as LiveType]} dans quelques minutes`,
      });
    }

    await supabase
      .from("live_events")
      .update({ reminder_sent_at: now.toISOString() })
      .eq("id", event.id);

    reminded++;
  }

  return NextResponse.json({ ok: true, reminded });
}
