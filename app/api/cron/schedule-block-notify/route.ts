import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { parisDateStr, parisTimeStr, parisIsoWeekday } from "@/lib/schedule-time";

// Notifie chaque propriétaire de bloc d'agenda (schedule_blocks) quand
// l'heure du jour atteint le début d'un bloc marqué notify=true — même
// principe que app/api/cron/send-reminders (table reminders), mais lu
// directement sur schedule_blocks pour rester synchro si l'heure du bloc
// change (un rappel copié dans `reminders` à la création restait, lui,
// figé même après modification du bloc).

interface ScheduleBlockRow {
  id: string;
  owner_id: string;
  day_of_week: number; // 1 = lundi ... 7 = dimanche
  start_time: string; // "HH:MM:SS"
  label: string;
  notify: boolean;
  last_notified_at: string | null;
  alarm_ack_date: string | null;
}

// Un réveil raté ("j'ai pas été réveillé car seulement notif sans son",
// retour direct 2026-09-01) n'a qu'un seul essai avec la logique
// last_notified_at classique : si le son système n'a pas suffi (téléphone en
// silencieux, Focus/DND — hors de portée du code, voir AlarmPlayer.tsx), il
// n'y a jamais de deuxième chance. Pour un bloc réveil, on relance donc la
// notif à chaque passage du cron (5 min) tant qu'elle n'est pas acquittée
// (alarm_ack_date, bouton "Arrêter" ou clic notif), avec une limite de 30 min
// après l'heure du bloc pour ne pas sonner indéfiniment si oublié.
const ALARM_ESCALATION_WINDOW_MIN = 30;

function minutesSince(startTime: string, nowTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [nh, nm] = nowTime.split(":").map(Number);
  return (nh * 60 + nm) - (sh * 60 + sm);
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = parisDateStr(now);
  const todayDow = parisIsoWeekday(now);
  const nowTime = parisTimeStr(now) + ":00"; // aligne sur le format start_time ("HH:MM:SS")

  const supabase = createAdminClient();
  const { data: blocks } = await supabase
    .from("schedule_blocks")
    .select("id, owner_id, day_of_week, start_time, label, notify, last_notified_at, alarm_ack_date")
    .eq("notify", true)
    .eq("day_of_week", todayDow);

  const due = (blocks as ScheduleBlockRow[] | null)?.filter((b) => {
    if (b.start_time > nowTime) return false; // pas encore l'heure
    const isAlarm = /r[ée]veil/i.test(b.label);
    if (isAlarm) {
      // Escalade : renvoyer tant que non acquitté, dans la fenêtre de 30 min.
      if (b.alarm_ack_date === today) return false; // déjà arrêté par l'utilisateur
      if (minutesSince(b.start_time, nowTime) > ALARM_ESCALATION_WINDOW_MIN) return false; // abandon, trop tard
      return true;
    }
    if (b.last_notified_at && parisDateStr(new Date(b.last_notified_at)) === today) return false; // déjà envoyé aujourd'hui
    return true;
  }) ?? [];

  let sent = 0;
  for (const block of due) {
    // L'agenda vit à un chemin différent selon le rôle (coach ou client) —
    // sans ça, la notif d'un coach le renvoyait vers l'agenda client.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", block.owner_id)
      .maybeSingle();
    const url = profile?.role === "coach" ? "/dashboard/coach/moi/agenda" : "/dashboard/client/agenda";

    // Un bloc "Réveil" doit vraiment sonner (voir components/ui/AlarmPlayer.tsx),
    // pas juste afficher une notif silencieuse qu'on peut rater en dormant.
    const isAlarm = /r[ée]veil/i.test(block.label);
    const result = await sendPushToUser(
      block.owner_id,
      `🕐 ${block.label}`,
      `C'est l'heure, ${block.label} commence maintenant.`,
      url,
      isAlarm ? "alarm" : undefined,
      isAlarm ? block.id : undefined
    );
    if (result.ok) {
      sent++;
      await supabase
        .from("schedule_blocks")
        .update({ last_notified_at: now.toISOString() })
        .eq("id", block.id);
    }
  }

  return NextResponse.json({ ok: true, checked: due.length, sent });
}
