// Types/constantes pures (aucun import serveur) — séparé de utils/resources.ts
// pour que les composants client (ex. ResourceManager.tsx) puissent les
// importer sans entraîner createServerSupabase (next/headers) dans le
// bundle navigateur, ce qui casse le build Next.js.

export const RESOURCE_CATEGORIES = [
  "Entraînement",
  "Nutrition",
  "Récupération",
  "Steps & activité quotidienne",
  "Psychologie",
  "Entrepreneuriat",
  "Général",
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

// Sous-catégories pour le filtre de recherche des lead magnets — utile
// seulement à partir du moment où une catégorie a assez d'entrées pour que
// naviguer dedans sans sous-filtre devienne pénible. Liste vivante, appelée
// à grossir avec la production de contenu ; "Général" reste sans
// sous-catégorie (catch-all volontairement large, pas un vrai thème).
export const RESOURCE_SUBCATEGORIES: Record<ResourceCategory, readonly string[]> = {
  "Entraînement": [
    "Intensité & RIR",
    "Volume & fréquence",
    "Technique & exécution",
    "Programmation",
    "Débutants",
    "Hypertrophie",
    "Force",
  ],
  "Nutrition": [
    "Macronutriments",
    "Timing & fréquence des repas",
    "Perte de gras",
    "Prise de masse",
    "Compléments",
    "Comportement alimentaire",
    "Jeûne & fenêtres",
  ],
  "Récupération": [
    "Sommeil",
    "Gestion de la fatigue",
    "Étirements & mobilité",
    "Deload & diet break",
  ],
  "Steps & activité quotidienne": [
    "Marche & NEAT",
    "Objectifs de pas",
    "Activité hors salle",
  ],
  "Psychologie": [
    "Motivation",
    "Confiance & image corporelle",
    "Stress & charge mentale",
    "Habitudes & discipline",
    "Débuter en salle",
  ],
  "Entrepreneuriat": [
    "Lancement & offre",
    "Mindset entrepreneurial",
    "Gestion du temps",
    "Finances & tarifs",
    "Clients & fidélisation",
  ],
  "Général": [],
};

export interface ResourceItem {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  category: string | null;
  created_at: string;
}
