import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser, notifyUsers } from "@/lib/notify";
import { getClients } from "@/utils/auth";
import { LIVE_TYPE_LABELS, isOneToOneType, type LiveType } from "@/lib/live-types";

// Rappel "à J-1" (distinct du rappel "dans quelques minutes" de
// live-reminders) — déclenché toutes les heures par Supabase pg_cron (voir
// supabase/migrations/20260802b_live_foundations.sql). reminder_24h_sent_at
// évite les doublons si le cron repasse sur le même événement.
const WINDOW_START_HOURS = 23;
const WINDOW_END_HOURS = 25;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() + WINDOW_START_HOURS * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + WINDOW_END_HOURS * 60 * 60 * 1000);

  const { data: events } = await supabase
    .from("live_events")
    .select("id, title, type, invited_client_id, starts_at, host_id")
    .eq("status", "scheduled")
    .is("reminder_24h_sent_at", null)
    .gte("starts_at", windowStart.toISOString())
    .lte("starts_at", windowEnd.toISOString());

  let reminded = 0;

  for (const event of events ?? []) {
    const dateLabel = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long", hour: "2-digit", minute: "2-digit",
    }).format(new Date(event.starts_at as string));

    const params = {
      type: "live_reminder_24h",
      title: "📅 Live demain",
      body: `${event.title} : demain ${dateLabel}`,
      url: "/dashboard/client/live",
    };

    if (isOneToOneType(event.type as LiveType) && event.invited_client_id) {
      await notifyUser(event.invited_client_id as string, params);
    } else {
      const clients = await getClients(event.host_id as string);
      await notifyUsers(clients.map((c) => c.id), {
        ...params,
        title: `📅 ${LIVE_TYPE_LABELS[event.type as LiveType]} demain`,
      });
    }

    await supabase
      .from("live_events")
      .update({ reminder_24h_sent_at: now.toISOString() })
      .eq("id", event.id);

    reminded++;
  }

  return NextResponse.json({ ok: true, reminded });
}
