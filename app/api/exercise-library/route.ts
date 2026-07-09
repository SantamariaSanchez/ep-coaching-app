import { NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { getExerciseLibrary } from "@/utils/exercise-library";

// Lecture seule, ouverte à tout membre connecté — sert le picker d'exercice
// de la séance (recherche + sélection) sans exposer utils/exercise-library.ts
// (client admin Supabase) au bundle client.
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exercises = await getExerciseLibrary();
  return NextResponse.json({ exercises });
}
