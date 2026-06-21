import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import type { ClientTask } from "@/utils/tasks";

// Re-notifies clients about pending tasks every `nag_minutes`, until checked
// off as done. Triggered every 10 min by Supabase pg_cron (see
// supabase/migrations/20260622_nag_tasks_cron.sql) — Vercel Hobby plan only
// allows daily cron jobs, which is too coarse for this. Protected by a
// shared secret so it can't be hit by randoms to spam push notifications.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: tasks } = await supabase
    .from("client_tasks")
    .select("*")
    .eq("status", "pending");

  const due = (tasks as ClientTask[] | null)?.filter((t) => {
    if (!t.last_notified_at) return true;
    const elapsedMin = (Date.now() - new Date(t.last_notified_at).getTime()) / 60000;
    return elapsedMin >= t.nag_minutes;
  }) ?? [];

  let sent = 0;
  for (const task of due) {
    const result = await sendPushToUser(
      task.client_id,
      `${task.icon} Rappel`,
      task.label,
      "/dashboard/client/tasks"
    );
    if (result.ok) {
      sent++;
      await supabase
        .from("client_tasks")
        .update({ last_notified_at: new Date().toISOString() })
        .eq("id", task.id);
    }
  }

  return NextResponse.json({ ok: true, checked: due.length, sent });
}
