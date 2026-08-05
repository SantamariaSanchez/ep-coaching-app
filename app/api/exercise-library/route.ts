import { NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { getExerciseLibrary } from "@/utils/exercise-library";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

// Lecture seule, ouverte à tout membre connecté — sert le picker d'exercice
// de la séance (recherche + sélection) sans exposer utils/exercise-library.ts
// (client admin Supabase) au bundle client.
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // La route renvoie la bibliotheque entiere : sans quota, elle sert de
  // robinet pour recopier tout le contenu de l'appli.
  const limited = await enforceRateLimit(
    `exercise-library:${user.id}`,
    PRESETS.expensiveRead.limit,
    PRESETS.expensiveRead.windowSeconds
  );
  if (limited) return limited;

  const exercises = await getExerciseLibrary();
  return NextResponse.json({ exercises });
}
