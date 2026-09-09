// Accessoires à prévoir pour une séance, déduits des noms d'exercices.
//
// Demande initiale (2026-09-08) : "dans programme ce serait bien que chaque
// séance on sache ce qu'il faut prévoir, du genre si dans la séance il y a un
// tirage vertical ça doit mettre sangles de tirage, ou encore s'il y a leg
// extension ça doit dire lockbelt".
//
// Correction du même jour : "pour les accessoires tu as oublié tous les
// accessoires du 0RIR shop car c'est quasi les seuls d'utile, le reste comme la
// ceinture à squat, d'ailleurs le squat c'est extrêmement nul, la lock belt
// peut déjà servir de ceinture". La liste ne contient donc plus que le
// catalogue 0RIR réel (vérifié sur 0rir-shop.com le 2026-09-08), et la ceinture
// de force générique a disparu : la Lock Belt couvre déjà ce rôle.
//
// Les exercices sont saisis en texte libre (table exercises, colonne name, pas
// de champ matériel), donc la déduction se fait par mots-clés sur le nom. Le
// principe assumé : ne proposer un accessoire que quand le nom est explicite.
// Mieux vaut ne rien suggérer qu'envoyer quelqu'un chercher du matériel dont il
// n'a pas besoin, ce qui décrédibiliserait toute la liste.

export interface AccessoryRule {
  /** Motif cherché dans le nom de l'exercice, en minuscules sans accent. */
  match: RegExp;
  accessory: string;
  /** Pourquoi cet accessoire, affiché sous le nom. */
  reason: string;
  /** Fiche produit, pour que le client sache quoi acheter exactement. */
  url: string;
}

/** Ordre volontaire : du plus structurant au plus optionnel. */
const RULES: AccessoryRule[] = [
  {
    // La Lock Belt est le seul accessoire qui change vraiment un exercice
    // machine : elle ancre le bassin au siège au lieu de laisser le corps
    // compenser. Elle sert aussi de ceinture de lest sur les tractions et dips.
    match:
      /(leg extension|leg curl|leg ext|extension de jambe|leg-?curl|hack squat|pendulum|dips machine|machine a dips|tirage vertical|tirage horizontal|lat pulldown|pulldown|rowing assis|banc a lombaire|lombaire|hyperextension|traction lest|dips lest|lest)/,
    accessory: "Lock Belt",
    reason: "T'ancre au siège pour arrêter de compenser, et sert de ceinture de lest sur les tractions et dips",
    url: "https://0rir-shop.com/products/lock-belt",
  },
  {
    // Le grip lâche avant le dos sur à peu près tous les tirages lourds.
    match:
      /(traction|tirage|pulldown|rowing|row |deadlift|souleve de terre|shrug|haussement|farmer|dumbbell row|tirage menton)/,
    accessory: "Prime Straps",
    reason: "La prise lâche avant le dos sur les tirages lourds, tu perds des répétitions pour rien",
    url: "https://0rir-shop.com/products/prime-straps",
  },
  {
    // Travail d'isolation à la poulie : la sangle se fixe au poignet ou à la
    // cheville, la main ne tient plus rien et le muscle ciblé travaille seul.
    match:
      /(elevation laterale|elevations laterales|elevation frontale|ecarte|ecartes|kickback|kick back|abduction|adduction|fessier a la poulie|curl poulie|extension triceps poulie|pull over|pullover)/,
    accessory: "Cuffs",
    reason: "Enlève la prise de l'équation sur l'isolation, le muscle ciblé travaille seul",
    url: "https://0rir-shop.com/products/cuffs",
  },
  {
    // Poulie mal placée pour la morphologie : les Lift Loops rallongent ou
    // raccourcissent la trajectoire au lieu de subir la machine.
    match: /(poulie|cable|câble|crossover|cross over)/,
    accessory: "Lift Loops",
    reason: "Rattrape une poulie trop haute ou trop éloignée pour garder la bonne trajectoire",
    url: "https://0rir-shop.com/products/lift-loops",
  },
  {
    // Machines dont le stack est régulièrement trop léger une fois qu'on
    // progresse : sans surcharge, la série s'arrête avant l'échec.
    match: /(mollet|calf|shrug|haussement|chest press|presse a cuisse|leg press|pec deck|butterfly)/,
    accessory: "Super Pin",
    reason: "Quand le stack de la machine est trop léger et que la série s'arrête avant l'échec",
    url: "https://0rir-shop.com/products/le-super-pin",
  },
  {
    // Progression en charges libres : passer de 20 à 22,5 kg sur un développé,
    // c'est parfois +12 % d'un coup. Les micro plates cassent le palier.
    match:
      /(developpe couche|developpe militaire|developpe incline|developpe decline|bench|overhead press|curl barre|curl haltere|squat)/,
    accessory: "Micro Plates",
    reason: "Pour monter par petits paliers au lieu de sauter 2,5 kg d'un coup et bloquer",
    url: "https://0rir-shop.com/products/micro-magnetic-plates",
  },
];

export interface SessionAccessory {
  accessory: string;
  reason: string;
  url: string;
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
 * règles (du plus structurant au plus optionnel). Renvoie un tableau vide quand
 * aucun exercice ne déclenche de règle : dans ce cas l'appelant n'affiche rien
 * du tout plutôt qu'une carte vide.
 *
 * Plafonné à 3 : au-delà ce n'est plus une liste de préparation, c'est un
 * catalogue, et plus personne ne la lit.
 */
export function accessoriesForSession(exerciseNames: string[]): SessionAccessory[] {
  const found = new Map<string, SessionAccessory>();

  // Un exercice ne compte que pour UNE règle : la première qu'il matche
  // dans l'ordre de priorité (RULES est déjà trié du plus structurant au
  // plus optionnel). Sans ce garde-fou, un exercice comme "Élévations
  // latérales poulie basse" matchait à la fois Cuffs (elevation laterale,
  // la vraie règle qui s'applique à une isolation à poste fixe) ET Lift
  // Loops (poulie, pensé pour un poste dont la hauteur/l'angle ne convient
  // pas) — retour direct 2026-09-09, "lift loop pour la séance legs
  // épaules c'est complètement faux". Deux accessoires suggérés pour le
  // même exercice, dont un qui n'a pas de sens ici, plutôt qu'un seul
  // vraiment pertinent.
  for (const raw of exerciseNames) {
    const name = normalize(raw);
    const rule = RULES.find((r) => r.match.test(name));
    if (!rule) continue;

    const existing = found.get(rule.accessory);
    if (existing) {
      if (!existing.forExercises.includes(raw)) existing.forExercises.push(raw);
    } else {
      found.set(rule.accessory, {
        accessory: rule.accessory,
        reason: rule.reason,
        url: rule.url,
        forExercises: [raw],
      });
    }
  }

  return [...found.values()].slice(0, 3);
}
