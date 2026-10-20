import { createServerSupabase } from "@/lib/supabase-server";
import type { Db } from "@/lib/db-types";
import { todayInParis } from "@/lib/dates";
import { getClientIntake } from "@/utils/client-intake";
import { getScheduleBlocks } from "@/utils/agenda";
import { getExerciseLibrary } from "@/utils/exercise-library";
import type { ProgramWithDays } from "@/utils/programs";
import { weekStartOf, slotForDay, equipmentKey, type DaySlot } from "@/lib/program-week";

// Tout ce que la page Mon programme montre autour des séances elles-mêmes :
// salle choisie, créneaux d'agenda, matériel des exercices, séances déjà
// faites cette semaine, séance ouverte aujourd'hui. Sérialisable, passé tel
// quel à ProgramWeekView (composant client).

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
}

async function getWeekSessions(userId: string, weekStart: string, today: string, db?: Db) {
  try {
    const supabase = db ?? (await createServerSupabase());
    const { data } = await supabase
      .from("sessions")
      .select("day_label, session_date, is_completed")
      .eq("client_id", userId)
      .gte("session_date", weekStart)
      .order("session_date");
    const rows = (data as { day_label: string; session_date: string; is_completed: boolean }[]) ?? [];
    return {
      done: rows.filter((r) => r.is_completed).map((r) => ({ day_label: r.day_label, session_date: r.session_date })),
      open: rows.find((r) => !r.is_completed && r.session_date === today)?.day_label ?? null,
    };
  } catch {
    return { done: [], open: null };
  }
}

export async function getProgramWeekContext(userId: string, program: ProgramWithDays | null, db?: Db): Promise<ProgramWeekContext> {
  const today = todayInParis();
  const weekStart = weekStartOf(today);
  const [intake, blocks, library, week] = await Promise.all([
    getClientIntake(userId),
    getScheduleBlocks(userId),
    getExerciseLibrary(),
    getWeekSessions(userId, weekStart, today, db),
  ]);

  const names = new Set((program?.days ?? []).flatMap((d) => d.exercises.map((e) => e.name)));
  const keys = new Set([...names].map(equipmentKey));
  const equipmentByName: Record<string, string | null> = {};
  const accessoriesByName: Record<string, string[]> = {};
  for (const ex of library) {
    if (keys.has(equipmentKey(ex.name))) equipmentByName[equipmentKey(ex.name)] = ex.equipment;
    if (names.has(ex.name) && ex.accessories?.length) accessoriesByName[ex.name] = ex.accessories;
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
    doneThisWeek: week.done,
    openSessionLabel: week.open,
  };
}
