import { createAdminClient } from "@/lib/supabase-admin";
import { getDailyHabitScore } from "@/lib/habit-score";
import {
  addDaysToDate,
  bedtimeStats,
  countDistinctSessions,
  isoDowOf,
  isoWeekNumber,
  mondayOf,
  type WeeklyReviewData,
} from "@/lib/weekly-review-helpers";

// Revue de la semaine (audit 2026-09-29). Remplace pour tout le monde le
// check-in hebdo, jamais utilisé (réservé aux clients coachés, 0 ligne en
// base) : une page "Ma semaine" qui rassemble ce que la personne a DÉJÀ
// noté ailleurs (séances, bilans, repas, pas, records, score d'habitudes),
// sans rien lui redemander.
//
// Client admin, comme lib/habit-score.ts : l'appelant (page serveur) ne
// passe JAMAIS d'autre id que celui de l'utilisateur connecté, lu depuis
// sa session. Toutes les requêtes filtrent explicitement sur cet id.
//
// Toutes les requêtes partent en parallèle avec des colonnes minimales
// (une dizaine d'allers-retours, plus le score d'habitudes jour par jour).
// Une erreur de lecture renvoie null : la page affiche alors un message
// d'erreur explicite plutôt que des zéros trompeurs.

function avg(vals: (number | null | undefined)[]): number | null {
  const v = vals.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function normLabel(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

export async function getWeeklyReview(
  userId: string,
  weekStartInput: string,
  today: string,
): Promise<WeeklyReviewData | null> {
  try {
    const admin = createAdminClient();
    const weekStart = mondayOf(weekStartInput);
    const weekEnd = addDaysToDate(weekStart, 6);
    const prevStart = addDaysToDate(weekStart, -7);
    const isCurrentWeek = today >= weekStart && today <= weekEnd;
    // Dernier jour réellement écoulé : en cours de semaine, les jours à
    // venir ne doivent ni compter comme "manqués" ni gonfler un dénominateur.
    const lastDay = isCurrentWeek ? today : weekEnd;
    const daysElapsed = isoDowOf(lastDay) - isoDowOf(weekStart) + 1;

    const habitDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDaysToDate(weekStart, i);
      if (d <= lastDay) habitDates.push(d);
    }

    const [
      sessionsRes,
      workoutsRes,
      programRes,
      dailyRes,
      foodRes,
      nutritionRes,
      stepLogsRes,
      stepSettingsRes,
      recordsRes,
      reflectionRes,
      habitScores,
    ] = await Promise.all([
      admin
        .from("sessions")
        .select("id, session_date, day_label")
        .eq("client_id", userId)
        .eq("is_completed", true)
        .gte("session_date", weekStart)
        .lte("session_date", weekEnd)
        .order("session_date", { ascending: true }),
      admin
        .from("workout_logs")
        .select("session_id, logged_at")
        .eq("client_id", userId)
        .gte("logged_at", weekStart)
        .lte("logged_at", weekEnd),
      admin
        .from("programs")
        .select("frequency, program_days(weekday, day_label)")
        .eq("client_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1),
      admin
        .from("daily_logs")
        .select("log_date, weight_morning, sleep_hours, bedtime_actual, steps")
        .eq("client_id", userId)
        .gte("log_date", prevStart)
        .lte("log_date", weekEnd),
      // Colonnes brutes, sans embed foods(*) (voir utils/nutrition.ts) :
      // seuls le jour et les calories comptent ici.
      admin
        .from("food_logs")
        .select("logged_at, calories")
        .eq("client_id", userId)
        .gte("logged_at", weekStart)
        .lte("logged_at", weekEnd),
      admin
        .from("nutrition_profiles")
        .select("calories_target")
        .eq("client_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1),
      admin
        .from("step_logs")
        .select("log_date, steps_actual")
        .eq("client_id", userId)
        .gte("log_date", weekStart)
        .lte("log_date", weekEnd),
      admin.from("step_settings").select("daily_goal").eq("client_id", userId).maybeSingle(),
      admin
        .from("personal_records")
        .select("exercise_name, weight_kg, reps, achieved_at")
        .eq("client_id", userId)
        .gte("achieved_at", weekStart)
        .lte("achieved_at", weekEnd)
        .order("weight_kg", { ascending: false }),
      admin
        .from("mindset_journal_entries")
        .select("id, content, mood, entry_date")
        .eq("client_id", userId)
        .eq("prompt_key", "bilan_semaine")
        .gte("entry_date", weekStart)
        .lte("entry_date", weekEnd)
        .order("created_at", { ascending: false })
        .limit(1),
      Promise.all(habitDates.map((d) => getDailyHabitScore(userId, d))),
    ]);

    const firstError =
      sessionsRes.error ?? workoutsRes.error ?? programRes.error ?? dailyRes.error ?? foodRes.error ??
      nutritionRes.error ?? stepLogsRes.error ?? stepSettingsRes.error ?? recordsRes.error ?? reflectionRes.error;
    if (firstError) throw firstError;

    // ── Séances ─────────────────────────────────────────────────────────
    const completed = (sessionsRes.data ?? []) as { id: string; session_date: string | null; day_label: string | null }[];
    const sessionsDone = countDistinctSessions(
      completed,
      (workoutsRes.data ?? []) as { session_id: string | null; logged_at: string | null }[],
    );
    const doneLabels = [...new Set(completed.map((s) => s.day_label?.trim()).filter((l): l is string => !!l))];

    const program = ((programRes.data ?? []) as {
      frequency: number | null;
      program_days: { weekday: number | null; day_label: string | null }[] | null;
    }[])[0];
    const plannedDays = (program?.program_days ?? []).filter((d) => d.weekday != null && d.weekday >= 1 && d.weekday <= 7);
    const sessionsPlanned = plannedDays.length > 0 ? plannedDays.length : program?.frequency ?? null;
    const doneSet = new Set(completed.map((s) => normLabel(s.day_label)));
    // Manquée = prévue un jour DÉJÀ PASSÉ (aujourd'hui exclu, la journée
    // n'est pas finie) et aucune séance terminée du même nom cette semaine.
    const missedLabels = plannedDays
      .filter((d) => {
        const date = addDaysToDate(weekStart, (d.weekday as number) - 1);
        return date < today && date <= weekEnd && !doneSet.has(normLabel(d.day_label));
      })
      .sort((a, b) => (a.weekday as number) - (b.weekday as number))
      .map((d) => d.day_label?.trim() || "Séance");

    // ── Bilans, poids, sommeil ─────────────────────────────────────────
    const daily = (dailyRes.data ?? []) as {
      log_date: string; weight_morning: number | null; sleep_hours: number | null;
      bedtime_actual: string | null; steps: number | null;
    }[];
    const thisWeek = daily.filter((d) => d.log_date >= weekStart);
    const prevWeek = daily.filter((d) => d.log_date < weekStart);
    const avgWeight = avg(thisWeek.map((d) => d.weight_morning));
    const prevAvgWeight = avg(prevWeek.map((d) => d.weight_morning));
    const weightDelta = avgWeight != null && prevAvgWeight != null ? Math.round((avgWeight - prevAvgWeight) * 10) / 10 : null;
    const avgSleep = avg(thisWeek.map((d) => d.sleep_hours));

    // ── Nutrition ──────────────────────────────────────────────────────
    const kcalByDay = new Map<string, number>();
    for (const f of (foodRes.data ?? []) as { logged_at: string; calories: number | null }[]) {
      const day = f.logged_at.slice(0, 10);
      kcalByDay.set(day, (kcalByDay.get(day) ?? 0) + (Number(f.calories) || 0));
    }
    const kcalValues = [...kcalByDay.values()].filter((v) => v > 0);
    const avgKcal = kcalValues.length > 0 ? Math.round(kcalValues.reduce((a, b) => a + b, 0) / kcalValues.length) : null;
    const kcalTarget = ((nutritionRes.data ?? []) as { calories_target: number | null }[])[0]?.calories_target ?? null;

    // ── Pas : step_logs d'abord, sinon le champ pas du bilan du soir ────
    const stepsByDay = new Map<string, number>();
    for (const d of thisWeek) if (d.steps != null && d.steps > 0) stepsByDay.set(d.log_date, d.steps);
    for (const s of (stepLogsRes.data ?? []) as { log_date: string; steps_actual: number | null }[]) {
      if (s.steps_actual != null && s.steps_actual > 0) stepsByDay.set(s.log_date, s.steps_actual);
    }
    const stepsAvgRaw = avg([...stepsByDay.values()]);
    const avgSteps = stepsAvgRaw != null ? Math.round(stepsAvgRaw) : null;
    const stepGoal = (stepSettingsRes.data as { daily_goal: number | null } | null)?.daily_goal ?? null;

    // ── Score d'habitudes ──────────────────────────────────────────────
    // Un jour sans aucun élément suivi (components vide) n'a pas de score :
    // l'afficher à 0 ou 100 serait inventer un chiffre.
    const scoreByDate = new Map<string, number | null>();
    habitDates.forEach((d, i) => {
      const hs = habitScores[i];
      scoreByDate.set(d, hs.components.length > 0 ? hs.score : null);
    });
    const habitDays = Array.from({ length: 7 }, (_, i) => {
      const date = addDaysToDate(weekStart, i);
      return { date, score: scoreByDate.get(date) ?? null };
    });
    // Aujourd'hui n'est pas terminé : il s'affiche dans les barres mais
    // n'entre ni dans la moyenne ni dans meilleur/pire jour.
    const closed = habitDays.filter((d): d is { date: string; score: number } => d.score != null && d.date < today);
    const avgHabitRaw = avg(closed.map((d) => d.score));
    const avgHabit = avgHabitRaw != null ? Math.round(avgHabitRaw) : null;
    let bestDay: { date: string; score: number } | null = null;
    let worstDay: { date: string; score: number } | null = null;
    for (const d of closed) {
      if (!bestDay || d.score > bestDay.score) bestDay = d;
      if (!worstDay || d.score < worstDay.score) worstDay = d;
    }

    const records = ((recordsRes.data ?? []) as { exercise_name: string; weight_kg: number | null; reps: number | null }[]).map((r) => ({
      exercise: r.exercise_name,
      weightKg: r.weight_kg,
      reps: r.reps,
    }));

    const refl = ((reflectionRes.data ?? []) as { id: string; content: string; mood: number | null; entry_date: string }[])[0];

    return {
      weekStart,
      weekEnd,
      weekNumber: isoWeekNumber(weekStart),
      isCurrentWeek,
      daysElapsed: Math.max(1, Math.min(7, daysElapsed)),
      sessionsDone,
      sessionsPlanned,
      doneLabels,
      missedLabels,
      bilanDays: new Set(thisWeek.map((d) => d.log_date)).size,
      nutritionDays: kcalByDay.size,
      avgKcal,
      kcalTarget,
      avgSteps,
      stepGoal,
      avgSleep,
      bedtime: bedtimeStats(thisWeek.map((d) => d.bedtime_actual)),
      avgWeight,
      weightDelta,
      habitDays,
      avgHabit,
      bestDay,
      worstDay,
      records,
      reflection: refl ? { id: refl.id, content: refl.content, mood: refl.mood, entryDate: refl.entry_date } : null,
    };
  } catch (e) {
    console.error("getWeeklyReview error:", e);
    return null;
  }
}
