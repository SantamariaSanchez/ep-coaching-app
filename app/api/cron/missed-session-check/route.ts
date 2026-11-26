import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";
import { nowInParis, addMinutesToHhmm } from "@/lib/dates";
import { cronBearer } from "@/lib/cron-auth";
import { trainingAdherence } from "@/lib/training-adherence";

// Relance en douceur si une séance était prévue dans l'agenda aujourd'hui
// (bloc icon="salle", voir lib/agenda-presets.ts) et qu'elle n'a jamais été
// loggée dans le logbook — avant, rien ne reliait "séance planifiée" et
// "séance réellement faite". Cible 21h00 (Europe/Paris), assez tard pour
// laisser le temps de s'entraîner, sans attendre le lendemain matin où le
// rappel n'aurait plus aucun sens.
// Ancien fonctionnement : cron pg_cron déclenché une seule fois par jour à
// un décalage UTC fixe ('0 20 * * *'), qui ne tombait sur 21h Paris qu'en
// heure d'hiver (UTC+1) — en heure d'été (UTC+2) ça sonnait à 22h Paris,
// pg_cron ne suivant aucun fuseau horaire et ne s'ajustant jamais seul au
// changement d'heure. Correctif structurel (voir migration
// 20260916_fix_dst_drift_notification_crons.sql) : le cron tourne
// désormais toutes les 15 min, toute la journée, et c'est cette route qui
// décide dynamiquement si on est dans le bon créneau, en heure de Paris
// réelle (Intl, gère automatiquement l'heure d'été/hiver).
const TARGET_HHMM = "21:00";
const WINDOW_MINUTES = 15;

interface ScheduleBlockRow {
  owner_id: string;
  label: string;
  end_time: string;
}

function parisDateStr(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(date);
}

function parisIsoWeekday(date: Date): number {
  const w = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", weekday: "short" }).format(date);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[w] ?? 1;
}

function parisTimeStr(date: Date): string {
  return (
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date) + ":00"
  );
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== cronBearer()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { hhmm } = nowInParis();
  const windowEnd = addMinutesToHhmm(TARGET_HHMM, WINDOW_MINUTES);
  if (hhmm < TARGET_HHMM || hhmm >= windowEnd) {
    return NextResponse.json({ ok: true, skipped: true, reason: "hors créneau", hhmm });
  }

  const now = new Date();
  const today = parisDateStr(now);
  const todayDow = parisIsoWeekday(now);
  const nowTime = parisTimeStr(now);

  const supabase = createAdminClient();

  const { data: blocks } = await supabase
    .from("schedule_blocks")
    .select("owner_id, label, end_time")
    .eq("day_of_week", todayDow)
    .eq("icon", "salle")
    .lte("end_time", nowTime);

  const planned = (blocks as ScheduleBlockRow[] | null) ?? [];
  // Un seul rappel par personne même si plusieurs blocs "salle" le même jour.
  const byOwner = new Map<string, ScheduleBlockRow>();
  for (const b of planned) if (!byOwner.has(b.owner_id)) byOwner.set(b.owner_id, b);

  let sent = 0;
  for (const [ownerId, block] of byOwner) {
    const { count } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("client_id", ownerId)
      .eq("session_date", today)
      .eq("is_completed", true);

    if ((count ?? 0) > 0) continue; // déjà loggée, rien à faire

    const { data: profile } = await supabase.from("profiles").select("role, start_date").eq("id", ownerId).maybeSingle();
    const p = profile as { role: string; start_date: string | null } | null;
    const url = p?.role === "coach" ? "/dashboard/coach/moi/logbook" : "/dashboard/client/logbook";

    // Le rappel s'adapte à ce qui a vraiment été fait sur 14 jours (26/11) :
    // séances prévues par semaine = jours avec un bloc « salle » dans l'agenda.
    const since14 = parisDateStr(new Date(now.getTime() - 13 * 86_400_000));
    const [{ data: weekBlocks }, { count: done14 }] = await Promise.all([
      supabase.from("schedule_blocks").select("day_of_week").eq("owner_id", ownerId).eq("icon", "salle").not("day_of_week", "is", null),
      supabase.from("sessions").select("id", { count: "exact", head: true }).eq("client_id", ownerId).eq("is_completed", true).gte("session_date", since14),
    ]);
    const plannedPerWeek = new Set(((weekBlocks ?? []) as { day_of_week: number }[]).map((b) => b.day_of_week)).size;
    const weeksSinceStart = p?.start_date ? Math.floor((now.getTime() - new Date(`${p.start_date}T12:00:00Z`).getTime()) / (7 * 86_400_000)) : null;
    const adherence = trainingAdherence({ plannedPerWeek, done14d: done14 ?? 0, weeksSinceStart, label: block.label });

    await notifyUser(ownerId, {
      type: "missed_session_reminder",
      title: adherence.level === "decroche" ? "🏋️ On repart doucement" : "🏋️ Séance pas encore loggée",
      body: adherence.reminder,
      url,
    });
    sent++;
  }

  return NextResponse.json({ ok: true, checked: byOwner.size, sent });
}
