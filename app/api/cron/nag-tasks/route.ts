import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { insertNotification } from "@/utils/insert-notification";
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

  // "Mes tâches" est verrouillé côté client tant qu'il n'est pas abonné
  // (CoachOnlyGate) — nager un membre gratuit l'envoie taper une notif qui
  // débouche sur un mur "réservé aux membres coaching" au lieu de sa tâche.
  const dueCandidates = (tasks as ClientTask[] | null)?.filter((t) => {
    if (!t.last_notified_at) return true;
    const elapsedMin = (Date.now() - new Date(t.last_notified_at).getTime()) / 60000;
    return elapsedMin >= t.nag_minutes;
  }) ?? [];

  let due = dueCandidates;
  if (dueCandidates.length > 0) {
    const clientIds = [...new Set(dueCandidates.map((t) => t.client_id))];
    const { data: subscribed } = await supabase
      .from("profiles")
      .select("id")
      .in("id", clientIds)
      .eq("subscription_status", "active");
    const subscribedIds = new Set((subscribed ?? []).map((p) => p.id as string));
    due = dueCandidates.filter((t) => subscribedIds.has(t.client_id));
  }

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
      // Cloche in-app en plus du push (même défaut que schedule-block-notify/
      // send-reminders). Gardée strictement alignée sur le même succès de
      // push que last_notified_at ci-dessous, jamais écrite indépendamment :
      // ce cron nage toutes les 10 min tant que la tâche n'est pas cochée,
      // écrire la cloche sans cette garde la dupliquerait indéfiniment pour
      // un client sans abonnement push (le push échouerait en boucle, donc
      // last_notified_at n'avancerait jamais, et la condition "jamais
      // notifié" resterait vraie à chaque passage).
      await insertNotification({
        userId: task.client_id,
        type: "task_reminder",
        title: `${task.icon} Rappel`,
        body: task.label,
        url: "/dashboard/client/tasks",
      }).catch(() => {});
      await supabase
        .from("client_tasks")
        .update({ last_notified_at: new Date().toISOString() })
        .eq("id", task.id);
    }
  }

  return NextResponse.json({ ok: true, checked: due.length, sent });
}
