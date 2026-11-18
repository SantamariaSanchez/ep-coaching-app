// Corps reçu à la fin d'une séance (/api/client/sessions/[id]/complete).
// Tout vient du navigateur : bornes, types et tableaux vérifiés avant d'être
// écrits en base ou placés dans le mail envoyé au coach.

export interface CleanWorkout {
  exerciseName: string;
  muscleGroup: string;
  isDirect: boolean;
  setsCompleted: number;
  rirActual: number | null;
  weightKg: number | null;
}

export interface CleanCompleteBody {
  duration_minutes: number | null;
  general_feeling: number | null;
  energy_level: number | null;
  pump: number | null;
  notes: string;
  prs: unknown[];
  workoutData: CleanWorkout[];
}

const int = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : null;
const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;
const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** null si le corps n'est pas un objet (requête vide ou coupée). */
export function cleanCompleteBody(raw: unknown): CleanCompleteBody | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const b = raw as Record<string, unknown>;
  const workoutData = (Array.isArray(b.workoutData) ? b.workoutData : [])
    .filter((w): w is Record<string, unknown> => !!w && typeof w === "object")
    .map((w) => ({
      exerciseName: str(w.exerciseName, 120),
      muscleGroup: str(w.muscleGroup, 60),
      isDirect: w.isDirect === true,
      setsCompleted: int(w.setsCompleted, 0, 50) ?? 0,
      rirActual: num(w.rirActual, 0, 10),
      weightKg: num(w.weightKg, 0, 1000),
    }))
    .filter((w) => w.exerciseName && w.setsCompleted > 0)
    .slice(0, 60);
  return {
    duration_minutes: int(b.duration_minutes, 0, 1440),
    general_feeling: int(b.general_feeling, 1, 5),
    energy_level: int(b.energy_level, 1, 5),
    pump: int(b.pump, 1, 5),
    notes: str(b.notes, 2000),
    prs: Array.isArray(b.prs) ? b.prs.slice(0, 60) : [],
    workoutData,
  };
}
