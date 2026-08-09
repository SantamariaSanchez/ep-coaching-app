import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { getRecentWorkoutLogs } from "@/utils/workout-logs";

// Exercices récents + les plus loggués par CE client (14 derniers jours) —
// même logique que recentFoods/mostUsedFoods dans ClientNutritionView.tsx,
// pour éviter de chercher un nom et galérer à chaque fois qu'on ajoute un
// exercice hors-programme en séance (voir ExercisePicker.tsx).
export async function GET() {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const logs = await getRecentWorkoutLogs(guard.userId);

  const seenRecent = new Set<string>();
  const recent: { name: string; muscleGroup: string }[] = [];
  for (const log of logs) {
    const key = log.exercise_name.toLowerCase();
    if (seenRecent.has(key)) continue;
    seenRecent.add(key);
    recent.push({ name: log.exercise_name, muscleGroup: log.muscle_group });
    if (recent.length >= 8) break;
  }

  const counts = new Map<string, { name: string; muscleGroup: string; count: number }>();
  for (const log of logs) {
    const key = log.exercise_name.toLowerCase();
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { name: log.exercise_name, muscleGroup: log.muscle_group, count: 1 });
  }
  const mostUsed = [...counts.values()]
    .filter((e) => e.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map(({ name, muscleGroup }) => ({ name, muscleGroup }));

  return NextResponse.json({ recent, mostUsed });
}
