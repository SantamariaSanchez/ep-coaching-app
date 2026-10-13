import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";
import { alreadyNotifiedToday } from "@/utils/insert-notification";
import { isOn, type AppSetup, type Modules } from "@/lib/app-setup";

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

export async function runAdherenceReminders(now = new Date()): Promise<{ morning: number; evening: number; checkin: number }> {
  const sent = { morning: 0, evening: 0, checkin: 0 };
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

  // Qui est concerné à cette heure-ci (la plupart des passages : personne).
  type Due = { id: string; clock: LocalClock; kinds: ("morning" | "evening" | "checkin" | "checkin_late")[]; coachId: string | null };
  const due: Due[] = [];
  for (const p of people) {
    const clock = localClock(now, tzOf.get(p.id as string) ?? "Europe/Paris");
    const kinds: Due["kinds"] = [];
    const setup: AppSetup = { answers: {}, modules: modulesOf.get(p.id as string) ?? {}, completed: true };
    if (inWindow(clock.minutes, MORNING_MIN) && (isOn(setup, "poids") || isOn(setup, "sommeil"))) kinds.push("morning");
    if (inWindow(clock.minutes, EVENING_MIN)) kinds.push("evening");
    const day = p.checkin_day as number | null;
    if (p.coach_id && day) {
      if (clock.isoWeekday === day && inWindow(clock.minutes, CHECKIN_MIN)) kinds.push("checkin");
      if (clock.isoWeekday === (day % 7) + 1 && inWindow(clock.minutes, MORNING_MIN)) kinds.push("checkin_late");
    }
    if (kinds.length) due.push({ id: p.id as string, clock, kinds, coachId: (p.coach_id as string | null) ?? null });
  }
  if (!due.length) return sent;

  const dueIds = due.map((d) => d.id);
  const dates = [...new Set(due.map((d) => d.clock.date))];
  const weekStarts = [...new Set(due.map((d) => mondayOf(d.clock.date, d.clock.isoWeekday)))];
  const oldestWeek = weekStarts.sort()[0];
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
          body: "Poids et sommeil, 20 secondes. C'est ce qui permet d'ajuster ta diète au bon moment.",
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
