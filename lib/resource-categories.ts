// Types/constantes pures (aucun import serveur) — séparé de utils/resources.ts
// pour que les composants client (ex. ResourceManager.tsx) puissent les
// importer sans entraîner createServerSupabase (next/headers) dans le
// bundle navigateur, ce qui casse le build Next.js.

export const RESOURCE_CATEGORIES = [
  "Entraînement",
  "Nutrition",
  "Mental",
  "Récupération",
  "Général",
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export interface ResourceItem {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  category: string | null;
  created_at: string;
}
