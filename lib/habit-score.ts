import { createAdminClient } from "@/lib/supabase-admin";

// Score du jour façon jeu vidéo — demande explicite du 2026-08-15 : "un
// score de suivi des habitudes... si tout est fait c'est bien, si un bloc
// de travail est skip la note tombe, vraiment comme une progression dans
// un jeu". Distinct du système de points existant (lib/gamification-types.ts,
// POINTS/RANKS) qui ne fait que monter au fil du temps : celui-ci reflète
// UNE journée précise et peut redescendre à 0% du jour au lendemain, comme
// une jauge de forme plutôt qu'un score cumulé à vie.
//
// Chaque composant ne compte que s'il est "applicable" ce jour-là (ex. pas
// d'objectif de pas configuré, ou aucun bloc d'agenda avec des tâches ce
// jour) — un client qui n'utilise pas une fonctionnalité ne doit jamais
// être pénalisé pour ne pas l'avoir utilisée.

export interface HabitScoreComponent {
  key: string;
  label: string;
  /** 0 à 1 — fraction plutôt que binaire, pour ne pas punir à 0% une tâche partiellement faite. */
  ratio: number;
}

export interface HabitScore {
  /** 0 à 100, arrondi. */
  score: number;
  level: string;
  components: HabitScoreComponent[];
}

const LEVELS: Array<{ min: number; label: string }> = [
  { min: 90, label: "Parfait" },
  { min: 70, label: "Solide" },
  { min: 40, label: "En chantier" },
  { min: 0, label: "À la ramasse" },
];

function levelFor(score: number): string {
  return LEVELS.find((l) => score >= l.min)?.label ?? LEVELS[LEVELS.length - 1].label;
}

function isoWeekdayFromDate(date: string): number {
  const d = new Date(date + "T12:00:00");
  const jsDay = d.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

// Historique sur N jours (par défaut 7) — noté "reste pour une prochaine
// passe" au moment où le score du jour a été livré (2026-08-15). Réutilise
// getDailyHabitScore jour par jour plutôt que de dupliquer sa logique : ça
// reste correct si getDailyHabitScore évolue plus tard, au prix de N fois
// plus de requêtes (acceptable, appelé une fois par chargement de page,
// pas à chaque interaction).
export interface DailyHabitPoint {
  date: string;
  score: number;
}

function isoDatesBack(endDate: string, days: number): string[] {
  const end = new Date(endDate + "T12:00:00");
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    out.push(d.toISOString().split("T")[0]);
  }
  return out;
}

export async function getWeeklyHabitScores(
  userId: string,
  endDate: string,
  days = 7
): Promise<DailyHabitPoint[]> {
  const dates = isoDatesBack(endDate, days);
  const scores = await Promise.all(dates.map((d) => getDailyHabitScore(userId, d)));
  return dates.map((date, i) => ({ date, score: scores[i].score }));
}

// Streak = jours consécutifs à ratio "solide" (>=70) en partant d'aujourd'hui
// et en remontant, arrêté au premier jour en dessous. Un jour sans aucun
// composant applicable (score 0 par défaut de getDailyHabitScore en cas
// d'erreur, ou 100 par manque de composants) n'est volontairement pas un
// cas particulier ici : le calcul reste celui du score déjà produit plus
// haut, cohérent avec ce que HabitScoreCard affiche pour ce jour-là.
//
// "Aujourd'hui" est traité à part (2026-09-16, retour direct : "améliore
// la rétention") : le dernier point de `points` est TOUJOURS la journée en
// cours (voir getWeeklyHabitScores/isoDatesBack), dont le score démarre à
// 0% chaque matin avant que le client ait fait son bilan/repas/pas — la
// journée n'est simplement pas terminée, ce n'est pas un échec. Avant ce
// correctif, le badge "🔥 Nj de suite" (HabitScoreTrend.tsx) retombait
// donc à 0 tous les matins pour TOUT client, même avec un streak réel de
// plusieurs semaines derrière lui, jusqu'à ce qu'il ait rempli assez de
// choses dans la journée pour repasser au-dessus du seuil — exactement
// l'inverse de l'effet recherché par un streak. Le calcul se base
// désormais sur les jours déjà clos (hier et avant), et aujourd'hui ne
// peut plus que PROLONGER ce streak (s'il est déjà au-dessus du seuil),
// jamais le casser avant la fin de la journée.
export function currentStreak(points: DailyHabitPoint[], threshold = 70): number {
  if (points.length === 0) return 0;
  const closedDays = points.slice(0, -1);
  let streak = 0;
  for (let i = closedDays.length - 1; i >= 0; i--) {
    if (closedDays[i].score >= threshold) streak++;
    else break;
  }
  const today = points[points.length - 1];
  if (today.score >= threshold) streak++;
  return streak;
}

export async function getDailyHabitScore(userId: string, date: string): Promise<HabitScore> {
  try {
    const supabase = createAdminClient();

    const [dailyLogRes, foodLogRes, stepSettingsRes, stepLogRes, blocksRes, taskLogRes] = await Promise.all([
      supabase
        .from("daily_logs")
        .select("weight_morning, sleep_hours, sleep_rating, steps, digestion, stress, hunger")
        .eq("client_id", userId)
        .eq("log_date", date)
        .maybeSingle(),
      supabase.from("food_logs").select("id", { count: "exact", head: true }).eq("client_id", userId).eq("logged_at", date),
      supabase.from("step_settings").select("daily_goal").eq("client_id", userId).maybeSingle(),
      supabase.from("step_logs").select("steps_actual").eq("client_id", userId).eq("log_date", date).maybeSingle(),
      supabase.from("schedule_blocks").select("id, tasks, day_of_week").eq("owner_id", userId),
      supabase.from("schedule_block_task_logs").select("completed_keys").eq("owner_id", userId).eq("log_date", date).maybeSingle(),
    ]);

    const dl = dailyLogRes.data as {
      weight_morning: number | null; sleep_hours: number | null; sleep_rating: number | null;
      steps: number | null; digestion: string | null; stress: string | null; hunger: string | null;
    } | null;
    const morningDone = !!dl && dl.weight_morning != null && dl.sleep_hours != null && dl.sleep_rating != null;
    const eveningDone = !!dl && dl.steps != null && dl.digestion != null && dl.stress != null && dl.hunger != null;

    const components: HabitScoreComponent[] = [
      { key: "morning", label: "Bilan matin", ratio: morningDone ? 1 : 0 },
      { key: "evening", label: "Bilan soir", ratio: eveningDone ? 1 : 0 },
      { key: "nutrition", label: "Nutrition loguée", ratio: (foodLogRes.count ?? 0) > 0 ? 1 : 0 },
    ];

    const goal = (stepSettingsRes.data as { daily_goal: number } | null)?.daily_goal ?? 0;
    if (goal > 0) {
      const actual = (stepLogRes.data as { steps_actual: number } | null)?.steps_actual ?? 0;
      components.push({ key: "steps", label: "Objectif de pas", ratio: Math.min(1, actual / goal) });
    }

    const dow = isoWeekdayFromDate(date);
    const todaysBlocks = ((blocksRes.data as { id: string; tasks: string[] | null; day_of_week: number }[]) ?? []).filter(
      (b) => b.day_of_week === dow && b.tasks && b.tasks.length > 0
    );
    const totalTasks = todaysBlocks.reduce((sum, b) => sum + (b.tasks?.length ?? 0), 0);
    if (totalTasks > 0) {
      const completedKeys = new Set((taskLogRes.data as { completed_keys: string[] } | null)?.completed_keys ?? []);
      const doneTasks = todaysBlocks.reduce(
        (sum, b) => sum + (b.tasks ?? []).filter((_, i) => completedKeys.has(`${b.id}:${i}`)).length,
        0
      );
      components.push({ key: "tasks", label: "Tâches d'agenda", ratio: doneTasks / totalTasks });
    }

    const avg = components.reduce((sum, c) => sum + c.ratio, 0) / components.length;
    const score = Math.round(avg * 100);
    return { score, level: levelFor(score), components };
  } catch (e) {
    console.error("getDailyHabitScore error:", e);
    return { score: 0, level: levelFor(0), components: [] };
  }
}
