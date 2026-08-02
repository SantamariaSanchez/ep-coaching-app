import type { ClientIntake } from "@/utils/client-intake";
import { ALLERGEN_LABELS } from "@/lib/recipes-data";

// Mots-clés dérivés de la fiche client pour signaler (jamais masquer — la
// base d'aliments n'a pas de tag allergène fiable par ingrédient, un filtre
// silencieux donnerait une fausse sécurité) les aliments à vérifier pendant
// la recherche/construction d'un plan, sans reposer la question à chaque
// fois (fiche déjà remplie une fois à l'onboarding).
export function buildWatchKeywords(intake: ClientIntake | null | undefined): string[] {
  if (!intake) return [];
  const keywords: string[] = intake.allergens.map((a) => ALLERGEN_LABELS[a].toLowerCase());
  if (intake.disliked_foods) {
    keywords.push(
      ...intake.disliked_foods
        .toLowerCase()
        .split(/[,;\n.]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 2)
    );
  }
  return keywords;
}

export function matchesWatchKeyword(foodName: string, keywords: string[]): string | null {
  const name = foodName.toLowerCase();
  return keywords.find((k) => name.includes(k) || k.includes(name)) ?? null;
}
