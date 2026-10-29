import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";
import { alreadyNotifiedToday } from "@/utils/insert-notification";
import { isOn, type AppSetup, type Modules } from "@/lib/app-setup";
import { getTrackingProfiles } from "@/lib/tracking-profile-server";
import { isWeighDay } from "@/lib/tracking-profile";

// Rappels d'adhérence (2026-10-13, retour direct du fondateur : « des
// rappels pour que le client adhère réellement, qu'il fasse ses bilans
// chaque jour, qu'il fasse ses check-in »). Jusqu'ici le bilan du jour
// n'était demandé qu'à l'ouverture de l'appli (DailyGateOverlay) : quelqu'un
// qui ne l'ouvrait pas n'avait jamais de rappel. Trois rappels, un seul
// passage chacun par jour, à l'heure de la personne (fuseau détecté sur son
// téléphone, Paris par défaut) :
//   - 10h : bilan du matin (poids, sommeil) s'il n'est pas fait ;
//   - 21h : bilan du jour s'il n'y a encore rien du tout aujourd'hui ;
//   - jour du check-in, 18h : check-in de la semaine s'il n'est pas envoyé,
//     puis une relance le lendemain à 10h.
// Seulement les personnes actives depuis 21 jours (les autres relèvent des
// relances de réengagement, lib/reengagement.ts), jamais les comptes démo.
// Appelé à chaque passage du cron meal-reminders (toutes les 15 min).

const MORNING_MIN = 10 * 60;
const EVENING_MIN = 21 * 60;
const CHECKIN_MIN = 18 * 60;
const WINDOW = 15;
const ACTIVE_DAYS = 21;

interface LocalClock {
  minutes: number;
  date: string; // YYYY-MM-DD
  isoWeekday: number; // 1 = lundi ... 7 = dimanche
}

function localClock(now: Date, timeZone: string): LocalClock {
  let tz = timeZone;
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: tz });
  } catch {
    tz = "Europe/Paris";
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  const days: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return {
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    date: `${parts.year}-${parts.month}-${parts.day}`,
    isoWeekday: days[parts.weekday as string] ?? 1,
  };
}

const inWindow = (minutes: number, target: number) => minutes >= target && minutes < target + WINDOW;

/** Lundi de la semaine (YYYY-MM-DD) d'une date locale. */
function mondayOf(date: string, isoWeekday: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (isoWeekday - 1));
  return d.toISOString().slice(0, 10);
}

const CADENCE_DAYS: Record<string, number> = { weekly: 7, biweekly: 14, monthly: 30 };

export async function runAdherenceReminders(now = new Date()): Promise<{ morning: number; evening: number; checkin: number; progress: number }> {
  const sent = { morning: 0, evening: 0, checkin: 0, progress: 0 };
  const admin = createAdminClient();
  const since = new Date(now.getTime() - ACTIVE_DAYS * 86400000);
  const sinceDate = since.toISOString().slice(0, 10);

  // Qui est actif : un bilan récent, ou inscrit récemment.
  const [{ data: recentLogs }, { data: newcomers }] = await Promise.all([
    admin.from("daily_logs").select("client_id").gte("log_date", sinceDate).limit(5000),
    admin.from("profiles").select("id").eq("role", "client").gte("created_at", since.toISOString()).limit(2000),
  ]);
  const ids = [...new Set([...(recentLogs ?? []).map((r) => r.client_id as string), ...(newcomers ?? []).map((r) => r.id as string)])];
  if (!ids.length) return sent;

  const [{ data: profiles }, { data: settings }, { data: setups }] = await Promise.all([
    admin.from("profiles").select("id, role, email, coach_id, checkin_day").in("id", ids),
    admin.from("user_settings").select("user_id, timezone").in("user_id", ids),
    admin.from("user_app_setup").select("user_id, modules").in("user_id", ids),
  ]);
  const tzOf = new Map((settings ?? []).map((s) => [s.user_id as string, (s.timezone as string | null) || "Europe/Paris"]));
  const modulesOf = new Map((setups ?? []).map((s) => [s.user_id as string, (s.modules as Modules) ?? {}]));

  const people = (profiles ?? []).filter((p) => p.role === "client" && !String(p.email ?? "").endsWith("@epcoaching.app"));
  if (!people.length) return sent;

  // Heures, fréquence et jours de rappel propres à chaque personne (moteur de
  // tracking) : un niveau Simple reçoit au plus un rappel, les jours de
  // pesée seulement, à une heure qui suit son réveil ; jamais d'insistance.
  const trackingOf = await getTrackingProfiles(people.map((p) => p.id as string));
  const toMin = (hhmm: string | null | undefined, fallback: number) => (hhmm ? Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5)) : fallback);

  // Qui est concerné à cette heure-ci (la plupart des passages : personne).
  type Due = { id: string; clock: LocalClock; kinds: ("morning" | "evening" | "checkin" | "checkin_late" | "progress")[]; coachId: string | null };
  const due: Due[] = [];
  for (const p of people) {
    const clock = localClock(now, tzOf.get(p.id as string) ?? "Europe/Paris");
    const kinds: Due["kinds"] = [];
    const setup: AppSetup = { answers: {}, modules: modulesOf.get(p.id as string) ?? {}, completed: true };
    const tp = trackingOf.get(p.id as string);
    const morningAt = toMin(tp?.reminders.morning, MORNING_MIN);
    const eveningAt = toMin(tp?.reminders.evening, EVENING_MIN);
    const day = p.checkin_day as number | null;
    if (p.coach_id && day) {
      if (clock.isoWeekday === day && inWindow(clock.minutes, CHECKIN_MIN)) kinds.push("checkin");
      if (clock.isoWeekday === (day % 7) + 1 && inWindow(clock.minutes, morningAt)) kinds.push("checkin_late");
    }
    const weighOk = !tp || !tp.reminders.weighDaysOnly || isWeighDay(tp, clock.isoWeekday);
    if (tp?.reminders.morning !== null && weighOk && inWindow(clock.minutes, morningAt) && (isOn(setup, "poids") || isOn(setup, "sommeil"))) kinds.push("morning");
    if ((!tp || tp.reminders.evening !== null) && inWindow(clock.minutes, eveningAt)) kinds.push("evening");
    // Photos et mensurations : un seul rappel doux, le jour du check-in (ou le
    // dimanche sans check-in), jamais pour une personne dont la relation à
    // l'alimentation est signalée (pas de pression sur le corps).
    const progressDay = day ?? 7;
    if (tp && tp.eatingSafety === "clear" && (tp.photos.cadence !== "off" || tp.measurements.cadence !== "off") && clock.isoWeekday === progressDay && inWindow(clock.minutes, morningAt + 60)) kinds.push("progress");
    // Jamais plus de rappels par jour que le niveau de suivi le permet.
    if (tp && kinds.length > tp.reminders.maxPerDay) kinds.splice(tp.reminders.maxPerDay);
    if (kinds.length) due.push({ id: p.id as string, clock, kinds, coachId: (p.coach_id as string | null) ?? null });
  }
  if (!due.length) return sent;

  const dueIds = due.map((d) => d.id);
  const dates = [...new Set(due.map((d) => d.clock.date))];
  const weekStarts = [...new Set(due.map((d) => mondayOf(d.clock.date, d.clock.isoWeekday)))];
  const oldestWeek = weekStarts.sort()[0];
  const progressIds = due.filter((d) => d.kinds.includes("progress")).map((d) => d.id);
  const lastPhoto = new Map<string, string>();
  const lastMeasure = new Map<string, string>();
  if (progressIds.length) {
    const [{ data: ph }, { data: ci }, { data: me }] = await Promise.all([
      admin.from("photo_updates").select("client_id, submitted_at").in("client_id", progressIds).order("submitted_at", { ascending: false }).limit(2000),
      admin.from("check_ins").select("client_id, week_start, photo_urls").in("client_id", progressIds).order("week_start", { ascending: false }).limit(2000),
      admin.from("measurements").select("client_id, measured_at").in("client_id", progressIds).order("measured_at", { ascending: false }).limit(2000),
    ]);
    for (const r of ph ?? []) if (!lastPhoto.has(r.client_id as string)) lastPhoto.set(r.client_id as string, String(r.submitted_at).slice(0, 10));
    for (const r of ci ?? []) if (((r.photo_urls as string[] | null)?.length ?? 0) > 0) {
      const cur = lastPhoto.get(r.client_id as string);
      const d0 = String(r.week_start).slice(0, 10);
      if (!cur || d0 > cur) lastPhoto.set(r.client_id as string, d0);
    }
    for (const r of me ?? []) if (!lastMeasure.has(r.client_id as string)) lastMeasure.set(r.client_id as string, String(r.measured_at).slice(0, 10));
  }
  const daysSince = (date: string | undefined, today: string) => (date ? Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${date}T12:00:00Z`)) / 86400000) : Infinity);
  const [{ data: todayLogs }, { data: checkins }] = await Promise.all([
    admin.from("daily_logs").select("client_id, log_date, weight_morning, sleep_hours").in("client_id", dueIds).in("log_date", dates),
    admin.from("check_ins").select("client_id, week_start, created_at").in("client_id", dueIds).gte("week_start", oldestWeek),
  ]);

  for (const d of due) {
    const log = (todayLogs ?? []).find((l) => l.client_id === d.id && l.log_date === d.clock.date);
    for (const kind of d.kinds) {
      if (kind === "morning" && !(log && (log.weight_morning != null || log.sleep_hours != null))) {
        if (await alreadyNotifiedToday(d.id, "daily_bilan_reminder_morning")) continue;
        await notifyUser(d.id, {
          type: "daily_bilan_reminder_morning",
          title: "☀️ Ton bilan du matin",
          body: trackingOf.get(d.id)?.level === "simple" ? "Ta pesée du jour, 10 secondes. Ta tendance se construit pas à pas." : "Poids et sommeil, 20 secondes. C'est ce qui permet d'ajuster ta diète au bon moment.",
          url: "/dashboard/client",
        }).catch(() => {});
        sent.morning += 1;
      }
      if (kind === "evening" && !log) {
        if (await alreadyNotifiedToday(d.id, "daily_bilan_reminder_evening")) continue;
        await notifyUser(d.id, {
          type: "daily_bilan_reminder_evening",
          title: "🌙 Ta journée n'a pas encore son bilan",
          body: "Un bilan rapide avant de dormir : ta régularité se construit là.",
          url: "/dashboard/client",
        }).catch(() => {});
        sent.evening += 1;
      }
      if (kind === "progress") {
        const tp = trackingOf.get(d.id);
        if (!tp) continue;
        const photoDue = tp.photos.cadence !== "off" && daysSince(lastPhoto.get(d.id), d.clock.date) >= CADENCE_DAYS[tp.photos.cadence];
        const measureDue = tp.measurements.cadence !== "off" && daysSince(lastMeasure.get(d.id), d.clock.date) >= CADENCE_DAYS[tp.measurements.cadence];
        if (!photoDue && !measureDue) continue;
        if (await alreadyNotifiedToday(d.id, "progress_reminder")) continue;
        const what = photoDue && measureDue ? "tes photos et tes mensurations" : photoDue ? "tes photos" : "tes mensurations";
        await notifyUser(d.id, {
          type: "progress_reminder",
          title: "📸 Un point sur ta progression",
          body: `C'est le moment de faire ${what}. Même lumière, même endroit : ça se compare mieux, et ça prend 2 minutes.`,
          url: "/dashboard/client/checkin",
        }).catch(() => {});
        sent.progress += 1;
      }
      if (kind === "checkin" || kind === "checkin_late") {
        // Semaine du jour de check-in (la veille pour la relance du lendemain).
        const refDate = kind === "checkin" ? d.clock.date : new Date(new Date(`${d.clock.date}T12:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10);
        const refWeekday = kind === "checkin" ? d.clock.isoWeekday : ((d.clock.isoWeekday + 5) % 7) + 1;
        const weekStart = mondayOf(refDate, refWeekday);
        const done = (checkins ?? []).some((c) => c.client_id === d.id && String(c.week_start) >= weekStart);
        if (done || (await alreadyNotifiedToday(d.id, "checkin_reminder"))) continue;
        await notifyUser(d.id, {
          type: "checkin_reminder",
          title: kind === "checkin" ? "📋 C'est le jour de ton check-in" : "📋 Ton coach attend ton check-in",
          body: kind === "checkin" ? "5 minutes pour faire le point sur ta semaine. Ton coach s'en sert pour ajuster la suite." : "Il manque ton check-in de la semaine : sans lui, ton coach ajuste à l'aveugle.",
          url: "/dashboard/client/checkin",
        }).catch(() => {});
        sent.checkin += 1;
      }
    }
  }
  return sent;
}
