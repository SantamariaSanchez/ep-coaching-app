// Types/constantes pures — même séparation que lib/coach-specializations.ts.
// Axe 4 (VISION.md) : catégories fixes pour le journal revenus/dépenses
// personnel du coach. Volontairement une liste courte : le but est de
// suivre son activité vite, pas de remplacer un vrai logiciel de compta.

export const REVENUE_CATEGORIES = [
  "Abonnements clients",
  "Coaching individuel",
  "Vente de formation",
  "Autre revenu",
] as const;

export const EXPENSE_CATEGORIES = [
  "Logiciels & outils",
  "Marketing & publicité",
  "Formation continue",
  "Matériel",
  "Déplacements",
  "Autre dépense",
] as const;

export type RevenueCategory = (typeof REVENUE_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export function categoriesFor(kind: "revenu" | "depense"): readonly string[] {
  return kind === "revenu" ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES;
}
