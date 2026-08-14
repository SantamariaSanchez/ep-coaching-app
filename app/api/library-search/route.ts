import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { getAllFoods } from "@/utils/nutrition";
import { getExerciseLibrary } from "@/utils/exercise-library";
import { getGymsWithReviews } from "@/utils/gyms";
import { getScienceArticles } from "@/utils/science";
import { cleanText, LIMITS } from "@/lib/sanitize";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

// Item 38 (chantier 50 idées) : recherche unique à travers les bibliothèques
// de contenu déjà existantes mais séparées (aliments, exercices, salles,
// science) — appelée depuis la palette de commande (item 5). Les 4 lectures
// passent déjà par unstable_cache (item 1/4), donc filtrer ici ne recharge
// rien : c'est la même donnée déjà en mémoire, juste servie à travers un
// seul point d'entrée au lieu d'ouvrir 4 pages différentes.
export interface LibrarySearchResult {
  key: string;
  label: string;
  category: "Aliment" | "Exercice" | "Salle" | "Science";
}

export async function GET(req: Request) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(
    `library-search:${guard.userId}`,
    PRESETS.expensiveRead.limit,
    PRESETS.expensiveRead.windowSeconds
  );
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const q = cleanText(searchParams.get("q"), LIMITS.searchQuery)?.toLowerCase().trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const [foods, exercises, gyms, articles] = await Promise.all([
    getAllFoods(),
    getExerciseLibrary(),
    getGymsWithReviews(),
    getScienceArticles(),
  ]);

  const results: LibrarySearchResult[] = [
    ...foods
      .filter((f) => f.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((f) => ({ key: `food-${f.id}`, label: f.name, category: "Aliment" as const })),
    ...exercises
      .filter((e) => e.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((e) => ({ key: `ex-${e.id}`, label: e.name, category: "Exercice" as const })),
    ...gyms
      .filter((g) => g.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((g) => ({ key: `gym-${g.id}`, label: g.name, category: "Salle" as const })),
    ...articles
      .filter((a) => (a.title_fr ?? a.title).toLowerCase().includes(q))
      .slice(0, 5)
      .map((a) => ({ key: `sci-${a.id}`, label: a.title_fr ?? a.title, category: "Science" as const })),
  ];

  return NextResponse.json({ results: results.slice(0, 16) });
}
