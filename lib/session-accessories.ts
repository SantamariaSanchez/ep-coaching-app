// Accessoires à prévoir pour une séance, déduits des noms d'exercices.
//
// Demande directe (2026-09-08) : "dans programme ce serait bien que chaque
// séance on sache ce qu'il faut prévoir, c'est ultra pratique, du genre si dans
// la séance il y a un tirage vertical ça doit mettre sangles de tirage, ou
// encore s'il y a leg extension ça doit dire lockbelt, donc une mini liste pour
// les accessoires à avoir".
//
// Les exercices sont saisis en texte libre (table exercises, colonne name, pas
// de champ matériel), donc la déduction se fait par mots-clés sur le nom. Le
// principe assumé : ne proposer un accessoire que quand le nom est explicite.
// Mieux vaut ne rien suggérer qu'envoyer quelqu'un chercher une ceinture dont
// il n'a pas besoin, ce qui décrédibiliserait toute la liste.

export interface AccessoryRule {
  /** Motif cherché dans le nom de l'exercice, en minuscules sans accent. */
  match: RegExp;
  accessory: string;
  /** Pourquoi cet accessoire, affiché au survol pour ne pas alourdir la liste. */
  reason: string;
}

const RULES: AccessoryRule[] = [
  {
    match: /(tirage vertical|tirage nuque|traction|lat pulldown|pulldown|rowing|tirage horizontal)/,
    accessory: "Sangles de tirage",
    reason: "La prise lâche souvent avant le dos sur les mouvements de tirage",
  },
  {
    match: /(leg extension|leg curl|extension de jambe|leg ext)/,
    accessory: "Lock belt",
    reason: "Stabilise le bassin et évite de décoller des appuis",
  },
  {
    match: /(souleve de terre|soulevé de terre|deadlift|squat)/,
    accessory: "Ceinture de force",
    reason: "Sur les séries lourdes en polyarticulaire",
  },
  {
    match: /(developpe couche|développé couché|bench|developpe militaire|développé militaire|overhead press)/,
    accessory: "Bandes de poignet",
    reason: "Maintient le poignet aligné sous charge",
  },
  {
    match: /(hip thrust|pont fessier)/,
    accessory: "Coussin de barre",
    reason: "Sinon la barre appuie directement sur les hanches",
  },
  {
    match: /(dips lest|traction lest|lest)/,
    accessory: "Ceinture de lest",
    reason: "Pour ajouter la charge au poids de corps",
  },
  {
    match: /(poulie|cable|câble)/,
    accessory: "Poignées ou corde",
    reason: "Selon la prise prévue sur la poulie",
  },
  {
    match: /(mollet|calf)/,
    accessory: "Cale ou step",
    reason: "Pour aller chercher l'amplitude complète en bas",
  },
  {
    match: /(abdo|crunch|gainage|planche)/,
    accessory: "Tapis",
    reason: "Confort au sol sur le travail abdominal",
  },
];

export interface SessionAccessory {
  accessory: string;
  reason: string;
  /** Exercices de la séance qui justifient cet accessoire. */
  forExercises: string[];
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Liste dédupliquée des accessoires à prévoir pour une séance, dans l'ordre des
 * règles (du plus spécifique au plus général). Renvoie un tableau vide quand
 * aucun exercice ne déclenche de règle : dans ce cas l'appelant n'affiche rien
 * du tout plutôt qu'une carte vide.
 */
export function accessoriesForSession(exerciseNames: string[]): SessionAccessory[] {
  const found = new Map<string, SessionAccessory>();

  for (const rule of RULES) {
    for (const raw of exerciseNames) {
      const name = normalize(raw);
      if (!rule.match.test(name)) continue;
      const existing = found.get(rule.accessory);
      if (existing) {
        if (!existing.forExercises.includes(raw)) existing.forExercises.push(raw);
      } else {
        found.set(rule.accessory, {
          accessory: rule.accessory,
          reason: rule.reason,
          forExercises: [raw],
        });
      }
    }
  }

  return [...found.values()];
}
