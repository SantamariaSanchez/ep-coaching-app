import { createServerSupabase } from "@/lib/supabase-server";
import type { Db } from "@/lib/db-types";
import { todayInParis } from "@/lib/dates";
import { getClientIntake } from "@/utils/client-intake";
import { getScheduleBlocks } from "@/utils/agenda";
import { getExerciseLibrary } from "@/utils/exercise-library";
import { EXECUTION_TIPS, getTips } from "@/lib/execution-tips";
import type { ProgramWithDays } from "@/utils/programs";
import {
  weekStartOf,
  addDaysIso,
  slotForDay,
  equipmentKey,
  buildExerciseHistory,
  type DaySlot,
  type ExerciseHistory,
  type LoggedSet,
} from "@/lib/program-week";

// Tout ce que la page Mon programme montre autour des séances elles-mêmes :
// salle choisie, créneaux d'agenda, matériel des exercices, séances déjà
// faites cette semaine, séance ouverte aujourd'hui, dernière performance par
// exercice et séries faites cette semaine par muscle. Sérialisable, passé tel
// quel à ProgramWeekView (composant client).

export interface ExerciseGuide {
  /** Consigne de la bibliothèque, sinon les repères d'exécution connus. */
  instructions: string | null;
  tips: string[];
  videoUrl: string | null;
  /** Photo de démonstration de la bibliothèque. */
  imageUrl?: string | null;
}

export interface ProgramWeekContext {
  today: string;
  weekStart: string;
  gym: { name: string; link: string | null } | null;
  /** Créneau d'agenda par jour du programme (id du jour). */
  slots: Record<string, DaySlot | null>;
  /** Nom d'exercice normalisé -> matériel (exercise_library.equipment). */
  equipmentByName: Record<string, string | null>;
  /** Accessoires choisis par exercice (exercise_library.accessories), clé = nom exact. */
  accessoriesByName: Record<string, string[]>;
  /** Séances terminées cette semaine : libellé -> date. */
  doneThisWeek: { day_label: string; session_date: string }[];
  /** Séance ouverte aujourd'hui (reprise plutôt que nouveau départ). */
  openSessionLabel: string | null;
  /** Dernière performance et tendance, clé = equipmentKey du nom. */
  history?: Record<string, ExerciseHistory>;
  /** Consigne et vidéo par exercice, clé = equipmentKey du nom. */
  guides?: Record<string, ExerciseGuide>;
  /** Séries enregistrées cette semaine par groupe musculaire. */
  weekSetsByMuscle?: Record<string, number>;
}

// Huit semaines d'historique suffisent pour « la dernière fois » et la
// tendance (fenêtre de 6 semaines, lib/program-week) ; plafonné pour rester
// léger même à deux séances par jour.
const HISTORY_DAYS = 56;
const HISTORY_MAX_SESSIONS = 80;
const SESSIONS_PER_QUERY = 20;

interface SessionRow {
  id: string;
  day_label: string;
  session_date: string;
  is_completed: boolean;
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function getTrainingData(userId: string, names: string[], weekStart: string, today: string, db?: Db) {
  const empty = { done: [], open: null, history: {}, weekSetsByMuscle: {} };
  try {
    const supabase = db ?? (await createServerSupabase());
    const since = [addDaysIso(today, -HISTORY_DAYS), weekStart].sort()[0];
    const { data } = await supabase
      .from("sessions")
      .select("id, day_label, session_date, is_completed")
      .eq("client_id", userId)
      .gte("session_date", since)
      .order("session_date", { ascending: false })
      .limit(HISTORY_MAX_SESSIONS);
    const sessions = (data as SessionRow[]) ?? [];
    const week = sessions.filter((s) => s.session_date >= weekStart);
    const done = week
      .filter((r) => r.is_completed)
      .map((r) => ({ day_label: r.day_label, session_date: r.session_date }))
      .sort((a, b) => a.session_date.localeCompare(b.session_date));
    const open = week.find((r) => !r.is_completed && r.session_date === today)?.day_label ?? null;

    const dateById = new Map(sessions.map((s) => [s.id, s.session_date]));
    const completedIds = sessions.filter((s) => s.is_completed).map((s) => s.id);
    const weekIds = week.map((s) => s.id);

    const [historyRows, weekRows] = await Promise.all([
      names.length === 0
        ? Promise.resolve([] as LoggedSet[])
        : Promise.all(
            chunk(completedIds, SESSIONS_PER_QUERY).map(async (ids) => {
              const { data: rows } = await supabase
                .from("session_sets")
                .select("exercise_name, session_id, set_number, weight_kg, reps_actual, rir_actual, created_at")
                .in("session_id", ids)
                .in("exercise_name", names);
              return ((rows as Omit<LoggedSet, "session_date">[]) ?? []).map((r) => ({
                ...r,
                session_date: dateById.get(r.session_id) ?? "",
              }));
            })
          ).then((parts) => parts.flat()),
      weekIds.length === 0
        ? Promise.resolve([] as { muscle_group: string | null }[])
        : supabase
            .from("session_sets")
            .select("muscle_group, session_id")
            .in("session_id", weekIds)
            .then(({ data: rows }) => (rows as { muscle_group: string | null }[]) ?? []),
    ]);

    const weekSetsByMuscle: Record<string, number> = {};
    for (const r of weekRows) {
      if (!r.muscle_group) continue;
      weekSetsByMuscle[r.muscle_group] = (weekSetsByMuscle[r.muscle_group] ?? 0) + 1;
    }
    return { done, open, history: buildExerciseHistory(historyRows, today), weekSetsByMuscle };
  } catch {
    return empty;
  }
}

export async function getProgramWeekContext(userId: string, program: ProgramWithDays | null, db?: Db): Promise<ProgramWeekContext> {
  const today = todayInParis();
  const weekStart = weekStartOf(today);
  const names = [...new Set((program?.days ?? []).flatMap((d) => d.exercises.map((e) => e.name)))];
  const [intake, blocks, library, training] = await Promise.all([
    getClientIntake(userId),
    getScheduleBlocks(userId),
    getExerciseLibrary(),
    getTrainingData(userId, names, weekStart, today, db),
  ]);

  const keys = new Set(names.map(equipmentKey));
  const exactNames = new Set(names);
  const equipmentByName: Record<string, string | null> = {};
  const accessoriesByName: Record<string, string[]> = {};
  const guides: Record<string, ExerciseGuide> = {};
  for (const ex of library) {
    const key = equipmentKey(ex.name);
    if (keys.has(key)) {
      equipmentByName[key] = ex.equipment;
      guides[key] = { instructions: ex.instructions?.trim() || null, tips: [], videoUrl: ex.video_url?.trim() || null, imageUrl: ex.image_url?.trim() || null };
    }
    if (exactNames.has(ex.name) && ex.accessories?.length) accessoriesByName[ex.name] = ex.accessories;
  }
  // Sans consigne en bibliothèque : les repères d'exécution connus (ceux de
  // la séance guidée), jamais la liste générique par défaut.
  for (const name of names) {
    const key = equipmentKey(name);
    if (guides[key]?.instructions) continue;
    const tips = getTips(name);
    if (tips === EXECUTION_TIPS.default) continue;
    guides[key] = { instructions: null, videoUrl: guides[key]?.videoUrl ?? null, imageUrl: guides[key]?.imageUrl ?? null, tips: tips.slice(0, 3) };
  }

  const slots: Record<string, DaySlot | null> = {};
  for (const d of program?.days ?? []) slots[d.id] = slotForDay(d, blocks, weekStart);

  return {
    today,
    weekStart,
    gym: intake?.gym_name?.trim() ? { name: intake.gym_name.trim(), link: intake.gym_link ?? null } : null,
    slots,
    equipmentByName,
    accessoriesByName,
    doneThisWeek: training.done,
    openSessionLabel: training.open,
    history: training.history,
    guides,
    weekSetsByMuscle: training.weekSetsByMuscle,
  };
}
