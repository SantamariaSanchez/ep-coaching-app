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
//
// Retour d'Emmanuel (2026-10-28) : « dans les accessoires tu n'as même pas mis les
// straps » sur des séances de tirage. Le calcul combine désormais le choix
// explicite par exercice (exercise_library.accessories) ET les accessoires
// déduits de l'exercice lui-même (derivedAccessoriesFor, plus bas) : straps
// pour tout mouvement de tirage, cuffs à la poulie, chaînes et bandes quand le
// nom les annonce. La devinette large par mots-clés (RULES) reste une simple
// suggestion cliquable dans ExerciseDetailPanel.

export interface AccessoryRule {
  /** Motif cherché dans le nom de l'exercice, en minuscules sans accent. */
  match: RegExp;
  accessory: string;
  /** Pourquoi cet accessoire, affiché sous le nom. */
  reason: string;
  /** Fiche produit, pour que le client sache quoi acheter exactement. */
  url: string;
}

// Retour direct 2026-09-10 ("les accessoires sont encore faux, c'est moi qui
// choisis") : le "bagage" complet du catalogue 0RIR, réutilisé à la fois par
// la devinette par mots-clés ci-dessous (RULES) ET par la sélection
// explicite par exercice (exercise_library.accessories, voir
// ExerciseDetailPanel) — une seule source de vérité pour le nom/la raison/
// le lien de chaque accessoire, jamais dupliquée entre les deux mécanismes.
export const ACCESSORY_CATALOG: { accessory: string; reason: string; url: string; /** Nom affiché si différent de la clé stockée. */ label?: string }[] = [
  {
    accessory: "Lock Belt",
    reason: "T'ancre au siège pour arrêter de compenser, et sert de ceinture de lest sur les tractions et dips",
    url: "https://0rir-shop.com/products/lock-belt",
  },
  {
    accessory: "Prime Straps",
    label: "Straps",
    reason: "La prise lâche avant le dos sur les tirages lourds, tu perds des répétitions pour rien",
    url: "https://0rir-shop.com/products/prime-straps",
  },
  {
    accessory: "Cuffs",
    reason: "Enlève la prise de l'équation sur l'isolation, le muscle ciblé travaille seul",
    url: "https://0rir-shop.com/products/cuffs",
  },
  {
    accessory: "Lift Loops",
    reason: "Rattrape une poulie trop haute ou trop éloignée pour garder la bonne trajectoire",
    url: "https://0rir-shop.com/products/lift-loops",
  },
  {
    accessory: "Super Pin",
    reason: "Quand le stack de la machine est trop léger et que la série s'arrête avant l'échec",
    url: "https://0rir-shop.com/products/le-super-pin",
  },
  {
    accessory: "Micro Plates",
    reason: "Pour monter par petits paliers au lieu de sauter 2,5 kg d'un coup et bloquer",
    url: "https://0rir-shop.com/products/micro-magnetic-plates",
  },
  // Retour direct 2026-09-17 : "à part le 0RIR shop, le reste c'est les fat
  // grip, mais sinon y'a vraiment rien d'autre qui est bien" — seul ajout
  // hors catalogue 0RIR (vérifié le 2026-09-17 sur 0rir-shop.com : Cuffs,
  // Lift Loops, Lock Belt, Micro Plates, Prime Straps, Super Pin, le "Sac
  // 0RIR" exclu ici car c'est le sac lui-même, pas un accessoire à y mettre).
  {
    accessory: "Fat Grips",
    reason: "Épaissit la prise pour cibler l'avant-bras, l'inverse de Prime Straps qui l'enlève de l'équation",
    url: "https://fatgripz.com/",
  },
  // Retour direct 2026-09-22 : liste corrigée par split réel (push, pull,
  // legs+épaule, upper, legs+biceps) plutôt que par mot-clé d'exercice. La
  // "Sangle en 8" en fait partie mais n'existe pas au catalogue 0RIR
  // (vérifié le 2026-09-22 sur 0rir-shop.com : 7 produits, aucun ne
  // correspond) — même statut que Fat Grips (hors 0RIR), mais sans lien
  // produit connu : url vide en attendant que Santamaria en donne un, pas
  // un lien inventé.
  // Podcast 0 RIR (épisode 15, accessoires) et demande d'Emmanuel : accessoires
  // associés à certains mouvements, sans fiche produit connue (url vide).
  { accessory: "Ceinture", reason: "Appui sur les mouvements très lourds, optionnelle", url: "" },
  { accessory: "Bandes de poignet", reason: "Confort sur les développés lourds, optionnelles (une barre bien alignée règle souvent le problème)", url: "" },
  { accessory: "Chaînes", reason: "La charge augmente en haut du mouvement", url: "" },
  { accessory: "Bandes élastiques", reason: "Résistance variable ou assistance", url: "" },
  { accessory: "Magnésie", reason: "Prise sûre sur les gros tirages", url: "" },
  {
    accessory: "Sangle en 8",
    reason: "Bloque le poignet à la barre en configuration \"8\" sur les tirages lourds, sans lâcher avant le dos",
    url: "",
  },
];

/** Ordre volontaire : du plus structurant au plus optionnel.
 * Retour direct 2026-09-10 ("les accessoires sont encore faux, c'est moi qui
 * choisis") : ce filet par mots-clés n'est PLUS utilisé pour AFFICHER un
 * accessoire dans une séance/un programme (voir accessoriesForSession
 * ci-dessous, qui ne renvoie plus que le choix explicite) — une devinette
 * fausse présentée comme un fait est pire que rien, exactement le principe
 * déjà écrit en haut de ce fichier. RULES reste exporté uniquement comme
 * SUGGESTION cliquable dans ExerciseDetailPanel au moment de configurer un
 * exercice (jamais auto-appliqué), pour ne pas repartir de zéro sur les 658
 * exercices de la bibliothèque. */
export const RULES: AccessoryRule[] = [
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

// Retour direct 2026-09-17 : "met aussi trépied et shaker Nutrimuscle, bon
// même si ça c'est tout le temps comme le shaker" — contrairement au bagage
// ci-dessus (déduit des exercices, capé à 3), ces deux-là n'ont aucun lien
// avec le contenu de la séance : toujours dans le sac, toujours affichés.
// `url` vide et `forExercises` vide les distinguent dans le rendu (pas de
// lien produit à cliquer, pas de "Pour tel exercice") plutôt que d'inventer
// une fiche produit ou une justification par exercice qui n'existe pas.
export const ALWAYS_ACCESSORIES: SessionAccessory[] = [
  { accessory: "Trépied", reason: "Pour filmer tes séries", url: "", forExercises: [] },
  { accessory: "Shaker Nutrimuscle", reason: "Intra et post-workout", url: "", forExercises: [] },
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Suggestion par mots-clés pour UN exercice, à utiliser uniquement comme
 * proposition cliquable dans ExerciseDetailPanel (jamais pour remplir
 * accessoriesForSession automatiquement, voir RULES ci-dessus). Renvoie
 * null si aucune règle ne matche : dans ce cas rien à suggérer non plus.
 */
export function guessedAccessoryForExercise(exerciseName: string): AccessoryRule | null {
  const name = normalize(exerciseName);
  return RULES.find((r) => r.match.test(name)) ?? null;
}

/**
 * Liste dédupliquée des accessoires à prévoir pour une séance. Renvoie un
 * tableau vide quand aucun exercice ne déclenche de règle : dans ce cas
 * l'appelant n'affiche rien du tout plutôt qu'une carte vide.
 *
 * Plafonné à 3 : au-delà ce n'est plus une liste de préparation, c'est un
 * catalogue, et plus personne ne la lit.
 *
 * `accessoriesByName` (retour direct 2026-09-10, "les accessoires sont
 * encore faux, c'est moi qui choisis") : UNIQUEMENT le bagage choisi
 * explicitement par exercice (exercise_library.accessories, éditable
 * depuis ExerciseDetailPanel). Plus AUCUN filet de devinette par mots-clés
 * ici (voir RULES/guessedAccessoryForExercise plus haut, réservés à une
 * suggestion cliquable dans le panneau de configuration, jamais affichés
 * comme un fait dans une séance) : un exercice sans choix explicite ne
 * renvoie simplement rien, plutôt qu'un accessoire deviné qui peut être
 * faux et se faire passer pour une vraie recommandation.
 */
/**
 * Accessoires déduits de l'exercice lui-même (nom et matériel de la
 * bibliothèque), pas devinés : straps pour tout mouvement de tirage où la
 * prise peut limiter le dos (rowing, tractions, tirages, shrugs, soulevés
 * de terre), cuffs pour le travail à la poulie, chaînes et bandes quand le
 * nom les annonce. Ceinture et bandes de poignet restent optionnelles
 * (podcast 0 RIR : pas essentielles). Les noms sont les clés du catalogue.
 */
export function derivedAccessoriesFor(exerciseName: string, equipment?: string | null): string[] {
  const n = normalize(exerciseName);
  const eq = equipment ? normalize(equipment) : "";
  const out: string[] = [];

  const pull =
    /(traction|tirage|pulldown|rowing|\brow\b|souleve de terre|deadlift|rack pull|shrug|haussement|farmer|high pull|pendlay|yates|seal row)/.test(n) &&
    !/(menton|upright|bras tendus|straight-arm|dead hang|suspension|hang\b|relev|toes to bar|knee raise|dragon|muscle-up|front lever|back lever|australienne|inverted|inverse|face pull)/.test(n);
  if (pull) out.push("Prime Straps");

  if (/souleve de terre|deadlift|rack pull/.test(n) && !/jambes tendues|roumain|romanian/.test(n)) out.push("Magnésie");

  const cable = eq === "poulie" || /(poulie|cable|crossover|pallof|face pull|woodchopper|pull-through)/.test(n);
  if (cable && !pull) out.push("Cuffs");

  if (/chaine/.test(n)) out.push("Chaînes");
  if (/avec bandes|bandes elastiques/.test(n)) out.push("Bandes élastiques");

  if (eq === "barre" && /(squat|souleve de terre|rack pull|good morning)/.test(n) && !/(gobelet|goblet|sauté|saute)/.test(n)) out.push("Ceinture");
  if (eq === "barre" && /(developpe couche|developpe militaire|developpe incline|floor press|spoto)/.test(n)) out.push("Bandes de poignet");
  return out;
}

const PRIORITY = ["Prime Straps", "Lock Belt", "Cuffs", "Lift Loops", "Super Pin", "Micro Plates", "Fat Grips", "Sangle en 8", "Magnésie", "Ceinture", "Bandes de poignet", "Chaînes", "Bandes élastiques"];
const MAX_BAG = 4;

/**
 * Liste dédupliquée des accessoires à prévoir pour une séance : le choix
 * explicite par exercice (exercise_library.accessories) PLUS les accessoires
 * déduits de l'exercice (derivedAccessoriesFor). Straps en tête dès qu'un
 * mouvement de tirage figure dans la séance. Plafonnée à 4 (+ trépied et
 * shaker toujours présents) : au-delà ce n'est plus une liste de préparation.
 *
 * `equipmentByName` (clé = nom normalisé, comme ProgramWeekContext) précise le
 * matériel de la bibliothèque quand on l'a.
 */
export function accessoriesForSession(
  exerciseNames: string[],
  accessoriesByName?: Record<string, string[] | null | undefined>,
  equipmentByName?: Record<string, string | null | undefined>
): SessionAccessory[] {
  const found = new Map<string, SessionAccessory>();

  function add(accessoryName: string, forExercise: string) {
    const catalogEntry = ACCESSORY_CATALOG.find((a) => a.accessory === accessoryName);
    const existing = found.get(accessoryName);
    if (existing) {
      if (!existing.forExercises.includes(forExercise)) existing.forExercises.push(forExercise);
      return;
    }
    found.set(accessoryName, {
      accessory: catalogEntry?.label ?? accessoryName,
      reason: catalogEntry?.reason ?? "",
      url: catalogEntry?.url ?? "",
      forExercises: [forExercise],
    });
  }

  for (const raw of exerciseNames) {
    const explicit = accessoriesByName?.[raw];
    if (explicit && explicit.length > 0) for (const accessoryName of explicit) add(accessoryName, raw);
    for (const accessoryName of derivedAccessoriesFor(raw, equipmentByName?.[normalize(raw)])) add(accessoryName, raw);
  }

  const labelOf = (key: string) => ACCESSORY_CATALOG.find((a) => a.accessory === key)?.label ?? key;
  const rank = (label: string) => {
    const i = PRIORITY.findIndex((k) => labelOf(k) === label);
    return i === -1 ? PRIORITY.length : i;
  };
  const ordered = [...found.values()].sort((x, y) => rank(x.accessory) - rank(y.accessory));
  return ordered.slice(0, MAX_BAG).concat(ALWAYS_ACCESSORIES);
}
