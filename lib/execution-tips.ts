export const EXECUTION_TIPS: Record<string, string[]> = {
  "Développé couché": [
    "Omoplates rétractées et déprimées contre le banc",
    "Pieds à plat au sol, fessiers en contact avec le banc",
    "Trajet de la barre légèrement oblique vers les épaules",
    "Coudes à 45-75° du tronc, jamais à 90°",
    "Descente contrôlée 2-3 secondes, poitrine complète",
  ],
  "Squat barre": [
    "Pieds largeur épaules, pointes légèrement ouvertes",
    "Barre sur les trapèzes moyens, pas sur la nuque",
    "Genoux dans l'axe des orteils tout au long",
    "Descente jusqu'à parallèle ou en dessous selon mobilité",
    "Pousser le sol, pas lever la barre",
  ],
  "Soulevé de terre": [
    "Barre au-dessus du milieu du pied, shin à 2-3cm",
    "Hanches pas trop basses ni trop hautes, dos neutre",
    "Épaules légèrement devant la barre au départ",
    "Pousser le sol, hanches et épaules montent ensemble",
    "Verrouille les hanches en fin de mouvement",
  ],
  "Tirage poulie haute": [
    "Prise légèrement plus large que les épaules",
    "Légère inclinaison du torse en arrière",
    "Tirer vers la clavicule, coudes vers les hanches",
    "Rétraction scapulaire à chaque répétition",
    "Contrôle total sur la remontée",
  ],
  "Développé militaire": [
    "Barre devant le visage, pas derrière la nuque",
    "Gainage abdominal strict, pas de lordose excessive",
    "Coudes légèrement devant la barre au départ",
    "Pousse verticalement, rentre la tête à la fin",
    "Verrouille les épaules en haut",
  ],
  "Curl biceps": [
    "Coudes fixes contre le tronc ou légèrement devant",
    "Supination complète du poignet en montant",
    "Pas de balancement du tronc",
    "Pic de contraction 1 seconde en haut",
    "Descente complète et contrôlée",
  ],
  "Extension triceps": [
    "Coudes fixes, seuls les avant-bras bougent",
    "Extension complète sans verrouiller les coudes",
    "Garder les coudes près de la tête",
    "Contrôle total à chaque répétition",
    "Stabilise les épaules avant de commencer",
  ],
  "Rowing barre": [
    "Dos plat, légèrement penché en avant (30-45°)",
    "Tirer le coude en arrière et vers le haut",
    "Rétraction de l'omoplate en fin de mouvement",
    "Pas de balancement avec le dos",
    "Contrôle total à la descente",
  ],
  "Développé incliné": [
    "Angle du banc entre 30° et 45°",
    "Même technique que le développé couché",
    "Pression davantage sur le haut pec",
    "Ne pas laisser les épaules monter vers les oreilles",
    "Descente contrôlée, pleine amplitude",
  ],
  "Hip thrust": [
    "Épaules appuyées sur le banc, pieds à plat",
    "Barre au niveau des hanches, pad de protection",
    "Extension complète des hanches sans creuser le bas du dos",
    "Contracte les fessiers au sommet, 1-2 secondes",
    "Contrôle la descente, genoux poussés vers l'extérieur",
  ],
  "Romanian deadlift": [
    "Dos neutre du début à la fin",
    "Charnière au niveau des hanches, pas de flexion lombaire",
    "Barre glisse le long des jambes",
    "Descend jusqu'à sentir les ischios, pas plus bas que ça",
    "Contracte les fessiers pour remonter",
  ],
  default: [
    "Maintiens le dos neutre tout au long",
    "Respiration : expire sur la phase concentrique",
    "Contrôle la phase excentrique (2-3 secondes)",
    "Range of motion complet selon ta mobilité",
    "Connexion visuelle avec le muscle ciblé",
  ],
};

export function getTips(exerciseName: string): string[] {
  // Exact match first
  if (EXECUTION_TIPS[exerciseName]) return EXECUTION_TIPS[exerciseName];
  // Partial match (case-insensitive)
  const lower = exerciseName.toLowerCase();
  for (const [key, tips] of Object.entries(EXECUTION_TIPS)) {
    if (key === "default") continue;
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return tips;
    }
  }
  return EXECUTION_TIPS["default"];
}
