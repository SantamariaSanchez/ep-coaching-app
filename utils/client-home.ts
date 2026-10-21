import { createServerSupabase } from "@/lib/supabase-server";
import type { Db } from "@/lib/db-types";
import { todayInParis, nowInParis } from "@/lib/dates";
import { addDaysIso, weekStartOf } from "@/lib/program-week";
import { mealTimesForDate } from "@/lib/meal-times";
import { readMealChecks } from "@/lib/meal-checks";
import { getScheduleBlocks, getScheduleBlockTaskLog } from "@/utils/agenda";
import { getActiveProgram } from "@/utils/programs";
import { getActiveDietPlan, getNutritionProfile, getTodayLogs } from "@/utils/nutrition";
import {
  bilanTimeOf,
  buildNutrition,
  buildTodos,
  buildTraining,
  homeBlocksFor,
  mealLabelsOf,
  type HomeDayData,
  type TrainingSessionRow,
} from "@/lib/client-home";

// Lecture serveur de l'accueil « Aujourd'hui » (voir lib/client-home.ts pour
// le calcul). `db` : uniquement l'aperçu « Voir comme mon client », qui lit
// les données du client regardé (client admin, après contrôle d'accès) au
// lieu de celles de la personne connectée. Rien n'est écrit ici.

export async function getClientHomeDay(
  userId: string,
  opts: {
    /** Client accompagné : messages, tâches et check-in du coach. */
    coached: boolean;
    checkinDone: boolean;
    checkinDay?: number | null;
    showVictory?: boolean;
    showCycle?: boolean;
  },
  db?: Db
): Promise<HomeDayData> {
  const date = todayInParis();
  const now = nowInParis().hhmm;
  const supabase = db ?? (await createServerSupabase());
  const since = [weekStartOf(date), addDaysIso(date, -6)].sort()[0];

  const [blocks, taskKeys, program, sessions, plan, logs, profile, checks, bilan, unread, tasks] = await Promise.all([
    getScheduleBlocks(userId),
    getScheduleBlockTaskLog(userId, date),
    getActiveProgram(userId, undefined, db),
    supabase
      .from("sessions")
      .select("day_label, session_date, is_completed")
      .eq("client_id", userId)
      .gte("session_date", since)
      .then(({ data }) => (data as TrainingSessionRow[] | null) ?? [], () => [] as TrainingSessionRow[]),
    getActiveDietPlan(userId, db),
    getTodayLogs(userId, date, db),
    getNutritionProfile(userId, db),
    readMealChecks(userId, date, date).then((r) => r.checks[date] ?? {}),
    supabase
      .from("daily_logs")
      .select("id", { count: "exact", head: true })
      .eq("client_id", userId)
      .eq("log_date", date)
      .then(({ count }) => (count ?? 0) > 0, () => true),
    opts.coached
      ? supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("receiver_id", userId)
          .eq("is_read", false)
          .then(({ count }) => count ?? 0, () => 0)
      : Promise.resolve(0),
    opts.coached
      ? supabase
          .from("client_tasks")
          .select("id, label")
          .eq("client_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(6)
          .then(({ data }) => (data as { id: string; label: string }[] | null) ?? [], () => [])
      : Promise.resolve([] as { id: string; label: string }[]),
  ]);

  const homeBlocks = homeBlocksFor(blocks, date, taskKeys);
  return {
    date,
    now,
    blocks: homeBlocks,
    training: buildTraining(program, blocks, sessions, date),
    nutrition: buildNutrition({ plan, logs, checks, profile, agendaTimes: mealTimesForDate(blocks, date), agendaLabels: mealLabelsOf(homeBlocks), today: date, now }),
    todos: buildTodos({
      coached: opts.coached,
      now,
      date,
      unreadMessages: unread,
      coachTasks: tasks,
      bilanDone: bilan,
      checkinDone: opts.checkinDone,
      checkinDay: opts.checkinDay ?? null,
      bilanTime: bilanTimeOf(homeBlocks),
      showVictory: !!opts.showVictory,
      showCycle: !!opts.showCycle,
    }),
  };
}
