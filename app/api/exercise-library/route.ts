import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { getExerciseLibrary } from "@/utils/exercise-library";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

// Lecture seule, ouverte à tout membre connecté — sert le picker d'exercice
// de la séance (recherche + sélection) sans exposer utils/exercise-library.ts
// (client admin Supabase) au bundle client.
export async function GET() {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  // La route renvoie la bibliotheque entiere : sans quota, elle sert de
  // robinet pour recopier tout le contenu de l'appli.
  const limited = await enforceRateLimit(
    `exercise-library:${guard.userId}`,
    PRESETS.expensiveRead.limit,
    PRESETS.expensiveRead.windowSeconds
  );
  if (limited) return limited;

  const exercises = await getExerciseLibrary();
  return NextResponse.json({ exercises });
}
