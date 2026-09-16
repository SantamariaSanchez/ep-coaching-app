import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { insertNotification } from "@/utils/insert-notification";

// The "Mes rappels" feature (app/dashboard/client/reminders) let users create
// time/day reminders, but nothing ever fired them — there was no cron job
// reading the `reminders` table at all. This route closes that gap, mirroring
// the nag-tasks cron (Vercel Hobby only allows daily cron, so this is driven
// by Supabase pg_cron every 10 min — see the matching migration).

interface ReminderRow {
  id: string;
  client_id: string;
  label: string;
  time: string;
  days: string[];
  is_active: boolean;
  last_sent_at: string | null;
}

function parisDateStr(date: Date): string {
  // en-CA formats as YYYY-MM-DD by default
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(date);
}

function parisTimeStr(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function parisDayAbbr(date: Date): string {
  const w = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short" }).format(date);
  return w.replace(".", "").toLowerCase().slice(0, 3); // "lun.", "mar." → "lun", "mar"
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = parisDateStr(now);
  const todayAbbr = parisDayAbbr(now);
  const nowTime = parisTimeStr(now);

  const supabase = createAdminClient();
  const { data: reminders } = await supabase
    .from("reminders")
    .select("*")
    .eq("is_active", true);

  const due = (reminders as ReminderRow[] | null)?.filter((r) => {
    if (!r.days.includes(todayAbbr)) return false;
    if (r.time > nowTime) return false; // not due yet today
    if (r.last_sent_at && parisDateStr(new Date(r.last_sent_at)) === today) return false; // already sent today
    return true;
  }) ?? [];

  let sent = 0;
  for (const reminder of due) {
    // Même défaut que celui corrigé sur schedule-block-notify (Axe BR,
    // "les notif, corrige, yen a plus la") : ce cron n'écrivait jamais en
    // base la notif "cloche" in-app, seulement le push. Si le push OS est
    // raté, repoussé ou coupé (pas de souscription, heures de silence,
    // permission refusée...), aucune trace de ce rappel n'existe nulle part
    // dans l'appli — la cloche ne peut jamais servir de filet de secours.
    // Écrit désormais la ligne in-app dès que le rappel est traité, une
    // seule fois par jour, que le push réussisse ou non.
    await insertNotification({
      userId: reminder.client_id,
      type: "reminder",
      title: "⏰ Rappel",
      body: reminder.label,
      url: "/dashboard/client/reminders",
    });

    const result = await sendPushToUser(
      reminder.client_id,
      "⏰ Rappel",
      reminder.label,
      "/dashboard/client/reminders"
    );
    if (result.ok) sent++;

    // Avance même si le push échoue (voir schedule-block-notify) : sinon un
    // client sans abonnement push retenterait, et réécrirait une ligne en
    // cloche, toutes les 10 min pour le reste de la journée.
    await supabase
      .from("reminders")
      .update({ last_sent_at: now.toISOString() })
      .eq("id", reminder.id);
  }

  return NextResponse.json({ ok: true, checked: due.length, sent });
}
