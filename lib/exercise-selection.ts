// Choix des exercices pour les programmes générés. Module pur.
//
// Source : critères de sélection du Mastermind (niveau 3) : tension sur le
// muscle visé, position de résistance, charge ajustable par petits paliers,
// facilité à reproduire d'une salle à l'autre, stabilité, et surtout
// accessibilité pour CE client. Statut : enseignement du mentor ; les listes
// ci-dessous sont un classement de départ (décision produit), toujours
// éditable par le coach. Le coach garde la main sur chaque exercice.
//
// Corrige aussi un défaut constaté : la bibliothèque contient des drills de
// mobilité, d'échauffement ou de rééducation rangés en « isolation » (bird
// dog, étirement de fléchisseurs, protocole Alfredson...) que l'ancien tri
// alphabétique pouvait proposer comme exercice d'hypertrophie.

import type { LibraryExercise } from "@/utils/exercise-library";
import type { TrainingLevel } from "@/lib/coaching-knowledge";

export type SlotCategory = "compose" | "isolation";

/** Exercices qui ne comptent jamais comme séries d'hypertrophie (échauffement, mobilité, rééducation, positions statiques). */
const NON_TRAINING =
  /stretch|étirement|mobilit|drill|\bcars?\b|circles|cercles|cat-cow|rotation (externe|interne)|y-t-w|bird dog|dead bug|activation|clam shell|monster walk|alfredson|tibialis|wall sit|hip hinge avec|thoracic|t-spine|dead hang|pigeon|leg swing|corde|double unders|mountain climbers|terminal knee|marchette|squeeze ballon|copenhagen|\(position|progression (tuck|advanced)|bus driver|lu raises|cuban|svend|kickback machine|adduction poulie/i;

export function isTrainingExercise(ex: Pick<LibraryExercise, "name" | "muscle_group">): boolean {
  if (ex.muscle_group === "Full Body / Cardio") return false;
  return !NON_TRAINING.test(ex.name);
}

interface Preferred {
  compose: string[];
  isolation: string[];
}

/**
 * Ordre de préférence par groupe (noms exacts de la bibliothèque). Un nom
 * d'un autre groupe peut figurer ici : il est alors rattaché au groupe visé
 * (ex. soulevé de terre roumain, rangé côté dos, travaille les ischios).
 */
export const PREFERRED_EXERCISES: Record<string, Preferred> = {
  Pectoraux: {
    compose: [
      "Développé incliné haltères",
      "Développé à la machine (chest press)",
      "Développé couché haltères",
      "Développé incliné machine",
      "Développé couché barre",
      "Développé couché Smith machine",
      "Développé incliné barre",
      "Pompes",
      "Dips pectoraux",
    ],
    isolation: ["Écarté à la poulie vis-à-vis", "Pec deck / Butterfly", "Crossover poulie haute", "Écarté incliné haltères", "Écarté couché haltères"],
  },
  Dos: {
    compose: [
      "Tirage vertical poulie haute (lat pulldown)",
      "Tirage horizontal poulie basse",
      "Machine tirage horizontal assis",
      "Rowing buste penché machine",
      "Tirage horizontal haltère (rowing unilatéral)",
      "Tirage vertical unilatéral",
      "Tirage vertical prise serrée (V-bar)",
      "Rowing T-bar",
      "Tirage horizontal barre",
      "Tractions pronation",
      "Traction australienne (bodyweight row)",
      "Rowing inversé (inverted row)",
    ],
    isolation: ["Pull-over poulie haute", "Tirage bras tendus (straight-arm pulldown)"],
  },
  Épaules: {
    compose: ["Développé épaules machine", "Développé militaire haltères", "Développé épaules Smith machine", "Développé militaire barre", "Landmine press", "Pike push-up"],
    isolation: [
      "Élévations latérales haltères",
      "Élévations latérales poulie",
      "Élévations latérales machine",
      "Reverse pec deck",
      "Face pull",
      "Oiseau (élévations postérieures) haltères",
    ],
  },
  Biceps: {
    compose: [],
    isolation: ["Curl incliné haltères", "Curl poulie basse", "Curl pupitre (Larry Scott)", "Curl haltères alterné", "Curl barre EZ", "Curl marteau", "Curl machine", "Curl barre droite"],
  },
  Triceps: {
    compose: ["Dips triceps (barres parallèles)", "Développé couché prise serrée haltères", "Dips triceps (banc)"],
    isolation: [
      "Triceps overhead poulie basse (corde)",
      "Extension poulie haute corde",
      "Overhead triceps extension barre EZ",
      "Extension poulie haute barre droite",
      "Extension triceps machine",
      "Barre au front (skull crusher)",
    ],
  },
  Quadriceps: {
    compose: [
      "Presse à cuisses (leg press)",
      "Hack squat",
      "Squat Smith machine",
      "Squat barre (back squat)",
      "Squat gobelet (goblet squat)",
      "Fentes bulgares",
      "Fentes avant",
      "Leg press pied bas (accent quadriceps)",
      "Step-up",
    ],
    isolation: ["Leg extension", "Sissy squat"],
  },
  "Ischio-jambiers": {
    compose: ["Soulevé de terre roumain", "Soulevé de terre roumain unilatéral", "Romanian deadlift barre sumo", "Glute-ham raise (GHR)"],
    isolation: ["Leg curl assis", "Leg curl couché", "Leg curl debout", "Leg curl sur swiss ball", "Nordic ham curl"],
  },
  Fessiers: {
    compose: [
      "Hip thrust machine",
      "Hip thrust barre",
      "Leg press pied haut (accent fessiers)",
      "Fentes marchées",
      "Squat sumo",
      "Cable pull-through",
      "Hip thrust kettlebell",
      "Pont fessier (glute bridge)",
      "Hip thrust unilatéral",
    ],
    isolation: ["Kickback poulie", "Abduction hanche machine", "Abduction hanche poulie", "Frog pump"],
  },
  Mollets: {
    compose: [],
    isolation: ["Mollets assis machine", "Mollets debout machine", "Mollets à la presse", "Mollets debout haltère unilatéral", "Mollets Smith machine", "Mollets debout unilatéral sans équipement"],
  },
  Abdominaux: {
    compose: [],
    isolation: ["Crunch poulie haute", "Relevé de jambes suspendu", "Relevé de jambes au sol", "Crunch machine", "Crunch au sol"],
  },
  Trapèzes: {
    compose: [],
    isolation: ["Shrugs haltères", "Shrugs barre", "Shrugs poulie basse"],
  },
};

/** Candidats venant d'un autre groupe que celui visé (soulevé de terre roumain pour les ischios, par exemple). */
export function crossGroupCandidates(library: LibraryExercise[], group: string, category: SlotCategory): LibraryExercise[] {
  const names = PREFERRED_EXERCISES[group]?.[category] ?? [];
  const out: LibraryExercise[] = [];
  for (const name of names) {
    const found = library.find((ex) => ex.name === name && ex.muscle_group !== group);
    if (found) out.push({ ...found, muscle_group: group, category });
  }
  return out;
}

const DIFFICULTY_ORDER: Record<string, number> = { debutant: 0, intermediaire: 1, avance: 2 };

/**
 * Rang d'un candidat pour un créneau (petit = meilleur). Liste de préférence
 * d'abord, puis un bonus pour la position étirée et les charges ajustables,
 * et une pénalité quand l'exercice dépasse le niveau de la personne.
 */
export function exerciseRank(ex: LibraryExercise, group: string, category: SlotCategory, level: TrainingLevel = "intermediaire"): number {
  const list = PREFERRED_EXERCISES[group]?.[category] ?? [];
  const idx = list.indexOf(ex.name);
  let rank = idx >= 0 ? idx : 40 + (DIFFICULTY_ORDER[ex.difficulty ?? "intermediaire"] ?? 1) * 3;

  const exLevel = DIFFICULTY_ORDER[ex.difficulty ?? "intermediaire"] ?? 1;
  const personLevel = DIFFICULTY_ORDER[level] ?? 1;
  if (exLevel > personLevel) rank += (exLevel - personLevel) * 6;

  if (ex.position === "Étirée") rank -= 1.5;
  if (ex.microloadable === true) rank -= 0.5;
  return rank;
}

export function rankCandidates(
  candidates: LibraryExercise[],
  group: string,
  category: SlotCategory,
  level: TrainingLevel = "intermediaire"
): LibraryExercise[] {
  return [...candidates].sort(
    (a, b) => exerciseRank(a, group, category, level) - exerciseRank(b, group, category, level) || a.name.localeCompare(b.name, "fr")
  );
}

/**
 * Précautions mécaniques à partir d'une blessure ou douleur écrite en texte
 * libre. Jamais un diagnostic : on écarte seulement les exercices qui
 * sollicitent le plus la zone déclarée, et la fiche rappelle de demander un
 * avis à un professionnel de santé.
 */
const INJURY_AVOID: { test: RegExp; avoid: string[] }[] = [
  { test: /genou|rotul|ménisq|menisq|croisé|croise|tendin\w* rotulien/i, avoid: ["fente", "pistol", "sissy", "sauté", "step-up", "bulgare", "leg extension", "spanish"] },
  { test: /dos|lombaire|lombalg|hernie|sciatique|vertèbre|vertebre|rachis/i, avoid: ["soulevé de terre", "good morning", "rack pull", "hyperextension", "rowing buste penché", "t-bar", "yates", "pendlay", "squat barre", "front squat", "zercher", "swing", "trap bar", "safety squat", "glute-ham"] },
  { test: /épaule|epaule|coiffe|acromion|clavicule/i, avoid: ["militaire barre", "nuque", "tirage menton", "upright", "dips", "arnold", "pike", "appui renversé", "développé couché barre", "écarté couché", "shrug press", "ring", "décliné"] },
  { test: /coude|épicondyl|epicondyl|golfeur|tennis elbow/i, avoid: ["barre au front", "skull", "french", "nuque haltère", "curl barre droite", "21s", "jm press", "tate", "spider", "pupitre"] },
  { test: /poignet|canal carpien/i, avoid: ["curl poignet", "wrist", "pompes", "dips", "farmer", "barre droite", "appui renversé"] },
  { test: /hanche|aine|adducteur|pubalg/i, avoid: ["sumo", "fente latérale", "copenhagen", "adduction", "bulgare"] },
  { test: /cheville|achille|talon|fasciite/i, avoid: ["sauté", "step-up", "mollets debout unilatéral", "fentes"] },
  { test: /nuque|cervical/i, avoid: ["shrug", "nuque", "tirage menton", "soulevé de terre", "pull-over"] },
];

export function injuryAvoidKeywords(injuries: string | null | undefined): string[] {
  if (!injuries || !injuries.trim()) return [];
  const out = new Set<string>();
  for (const rule of INJURY_AVOID) {
    if (rule.test.test(injuries)) rule.avoid.forEach((k) => out.add(k));
  }
  return [...out];
}

/** Vrai si le texte de blessure déclenche au moins une précaution. */
export function hasInjuryPrecautions(injuries: string | null | undefined): boolean {
  return injuryAvoidKeywords(injuries).length > 0;
}

/** Exercices lourds : haut de la fourchette de repos (2 à 3 minutes, plus sur presse et soulevé roumain). */
const HEAVY = /squat|presse|leg press|soulevé|deadlift|hip thrust|hack|développé couché barre|développé militaire barre|rowing t-bar|tirage horizontal barre/i;
export function isHeavyLift(name: string): boolean {
  return HEAVY.test(name);
}
