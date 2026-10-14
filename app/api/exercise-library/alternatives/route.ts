import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { getExerciseLibrary } from "@/utils/exercise-library";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

// « Machine prise » en séance : quelques remplaçants du même groupe
// musculaire tirés de la bibliothèque d'exercices, les plus proches d'abord
// (même sous-groupe), en privilégiant un autre matériel que celui qui est
// pris. Liste courte et légère, pas toute la bibliothèque.

interface ExerciseAlternative {
  name: string;
  muscle_group: string;
  muscle_subgroup: string | null;
  equipment: string | null;
}

function norm(v: string | null | undefined): string {
  return (v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export async function GET(req: Request) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(
    `exercise-alternatives:${guard.userId}`,
    PRESETS.expensiveRead.limit,
    PRESETS.expensiveRead.windowSeconds
  );
  if (limited) return limited;

  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? "";
  const exclude = new Set(url.searchParams.getAll("exclude").map(norm));
  let muscle = url.searchParams.get("muscle");
  let subgroup = url.searchParams.get("subgroup");

  const library = await getExerciseLibrary();
  const current = library.find((e) => norm(e.name) === norm(name)) ?? null;
  muscle = muscle || current?.muscle_group || null;
  subgroup = subgroup || current?.muscle_subgroup || null;
  const currentEquipment = norm(current?.equipment);

  if (!muscle) return NextResponse.json({ alternatives: [], muscle: null });

  const scored = library
    .filter((e) => norm(e.muscle_group) === norm(muscle) && norm(e.name) !== norm(name) && !exclude.has(norm(e.name)))
    .map((e) => {
      let score = 0;
      if (subgroup && norm(e.muscle_subgroup) === norm(subgroup)) score += 4;
      // La machine est prise : un autre matériel a plus de chances d'être libre.
      if (currentEquipment && norm(e.equipment) !== currentEquipment) score += 2;
      if (e.is_official) score += 1;
      return { e, score };
    })
    .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name, "fr"))
    .slice(0, 30)
    .map(({ e }): ExerciseAlternative => ({
      name: e.name,
      muscle_group: e.muscle_group,
      muscle_subgroup: e.muscle_subgroup,
      equipment: e.equipment,
    }));

  return NextResponse.json({ alternatives: scored, muscle });
}
