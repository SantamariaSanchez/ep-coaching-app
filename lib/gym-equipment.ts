// Salles d'entraînement : catalogue d'équipements, salles types et règle
// « cet exercice est-il faisable ici ? ».
//
// Décision d'Emmanuel : la programmation doit pouvoir poser une SALLE sur
// chaque séance, et ne proposer que les exercices faisables avec le matériel
// de cette salle (pas de squat pendulaire si la salle n'en a pas). Les
// équipements d'une salle sont des tags cochables (à la main, ou pré-cochés
// d'après des photos de machines). Module PUR : aucun import serveur.
//
// Principe de prudence, comme pour les accessoires : on ne bloque un exercice
// que si on SAIT qu'il manque quelque chose. Une salle dont le matériel n'a pas
// encore été renseigné ne filtre rien (sinon la liste serait vide à tort).

import { getEquipmentType } from "@/lib/exercise-library-content";

export type GymKind = "commerciale" | "crossfit" | "home_gym" | "poids_du_corps" | "custom";

export const GYM_KIND_LABELS: Record<GymKind, string> = {
  commerciale: "Grande salle commerciale",
  crossfit: "Salle de CrossFit",
  home_gym: "Home gym",
  poids_du_corps: "Poids du corps",
  custom: "Autre salle",
};

export interface EquipmentItem {
  key: string;
  label: string;
}

export interface EquipmentGroup {
  key: string;
  label: string;
  items: EquipmentItem[];
}

export const EQUIPMENT_GROUPS: EquipmentGroup[] = [
  {
    key: "libre",
    label: "Poids libres",
    items: [
      { key: "barbell", label: "Barre olympique et disques" },
      { key: "ez_bar", label: "Barre EZ" },
      { key: "trap_bar", label: "Trap bar" },
      { key: "safety_bar", label: "Safety squat bar" },
      { key: "landmine", label: "Landmine" },
      { key: "dumbbells", label: "Haltères" },
      { key: "kettlebells", label: "Kettlebells" },
    ],
  },
  {
    key: "racks",
    label: "Racks et bancs",
    items: [
      { key: "squat_rack", label: "Rack ou cage à squat" },
      { key: "flat_bench", label: "Banc plat" },
      { key: "adjustable_bench", label: "Banc inclinable" },
      { key: "preacher_bench", label: "Pupitre à biceps" },
      { key: "smith", label: "Smith machine" },
    ],
  },
  {
    key: "jambes",
    label: "Machines jambes et fessiers",
    items: [
      { key: "leg_press", label: "Presse à cuisses" },
      { key: "hack_squat", label: "Hack squat" },
      { key: "pendulum_squat", label: "Squat pendulaire (pendulum)" },
      { key: "belt_squat", label: "Belt squat" },
      { key: "leg_extension", label: "Leg extension" },
      { key: "leg_curl_seated", label: "Leg curl assis" },
      { key: "leg_curl_lying", label: "Leg curl couché" },
      { key: "leg_curl_standing", label: "Leg curl debout" },
      { key: "hip_thrust_machine", label: "Hip thrust machine" },
      { key: "glute_kickback_machine", label: "Kickback fessiers machine" },
      { key: "abductor_machine", label: "Machine abducteurs" },
      { key: "adductor_machine", label: "Machine adducteurs" },
      { key: "calf_standing", label: "Mollets debout machine" },
      { key: "calf_seated", label: "Mollets assis machine" },
      { key: "calf_donkey", label: "Mollets donkey" },
      { key: "ghd", label: "GHD / glute-ham" },
      { key: "back_extension", label: "Banc à lombaires" },
      { key: "reverse_hyper", label: "Reverse hyper" },
    ],
  },
  {
    key: "haut",
    label: "Machines haut du corps",
    items: [
      { key: "chest_press_machine", label: "Chest press (machine à pectoraux)" },
      { key: "pec_deck", label: "Pec deck / butterfly" },
      { key: "shoulder_press_machine", label: "Développé épaules machine" },
      { key: "lateral_raise_machine", label: "Élévations latérales machine" },
      { key: "seated_row_machine", label: "Rowing assis machine" },
      { key: "tbar_row", label: "T-bar / rowing chargé" },
      { key: "assisted_pullup_machine", label: "Tractions assistées machine" },
      { key: "dip_machine", label: "Dips machine" },
      { key: "biceps_curl_machine", label: "Curl biceps machine" },
      { key: "triceps_machine", label: "Extension triceps machine" },
      { key: "ab_machine", label: "Machine abdominaux" },
    ],
  },
  {
    key: "poulies",
    label: "Poulies",
    items: [
      { key: "cable_station", label: "Poulie réglable / vis-à-vis" },
      { key: "lat_pulldown", label: "Tirage vertical (poulie haute)" },
      { key: "low_row", label: "Tirage horizontal (poulie basse)" },
    ],
  },
  {
    key: "corps",
    label: "Poids du corps et gymnastique",
    items: [
      { key: "pullup_bar", label: "Barre de traction" },
      { key: "dip_bars", label: "Barres parallèles (dips)" },
      { key: "rings", label: "Anneaux" },
      { key: "parallettes", label: "Parallettes" },
      { key: "plyo_box", label: "Box de saut" },
    ],
  },
  {
    key: "cardio",
    label: "Cardio et conditionnement",
    items: [
      { key: "treadmill", label: "Tapis de course" },
      { key: "bike", label: "Vélo / assault bike" },
      { key: "rower", label: "Rameur" },
      { key: "elliptical", label: "Elliptique" },
      { key: "stair_climber", label: "Stair climber" },
      { key: "ski_erg", label: "Ski erg" },
      { key: "sled", label: "Traîneau (sled)" },
      { key: "battle_ropes", label: "Battle ropes" },
      { key: "jump_rope", label: "Corde à sauter" },
      { key: "medicine_ball", label: "Médecine ball / wall ball" },
      { key: "strongman", label: "Sac de sable, pneu, strongman" },
    ],
  },
  {
    key: "autres",
    label: "Autres",
    items: [
      { key: "resistance_bands", label: "Élastiques" },
      { key: "chains", label: "Chaînes" },
      { key: "foam_roller", label: "Rouleau, swiss ball" },
    ],
  },
];

export const ALL_EQUIPMENT: EquipmentItem[] = EQUIPMENT_GROUPS.flatMap((g) => g.items);
const KNOWN_KEYS = new Set(ALL_EQUIPMENT.map((i) => i.key));

export function equipmentLabel(key: string): string {
  return ALL_EQUIPMENT.find((i) => i.key === key)?.label ?? key;
}

/** Garde uniquement les clés connues, sans doublon. */
export function sanitizeEquipment(keys: unknown): string[] {
  if (!Array.isArray(keys)) return [];
  return [...new Set(keys.filter((k): k is string => typeof k === "string" && KNOWN_KEYS.has(k)))];
}

// ── Salles types ─────────────────────────────────────────────────────────────

const COMMERCIAL: string[] = [
  "barbell", "ez_bar", "dumbbells", "kettlebells", "squat_rack", "flat_bench", "adjustable_bench", "preacher_bench", "smith",
  "leg_press", "hack_squat", "leg_extension", "leg_curl_seated", "leg_curl_lying", "hip_thrust_machine", "abductor_machine", "adductor_machine",
  "calf_standing", "calf_seated", "back_extension", "chest_press_machine", "pec_deck", "shoulder_press_machine", "seated_row_machine",
  "assisted_pullup_machine", "dip_machine", "ab_machine", "cable_station", "lat_pulldown", "low_row", "pullup_bar", "dip_bars",
  "treadmill", "bike", "rower", "elliptical", "stair_climber", "resistance_bands", "foam_roller",
];

const CROSSFIT: string[] = [
  "barbell", "dumbbells", "kettlebells", "squat_rack", "flat_bench", "pullup_bar", "rings", "parallettes", "plyo_box", "dip_bars", "ghd",
  "rower", "bike", "ski_erg", "sled", "battle_ropes", "jump_rope", "medicine_ball", "strongman", "resistance_bands", "chains", "foam_roller",
];

const HOME: string[] = ["dumbbells", "adjustable_bench", "resistance_bands", "pullup_bar", "kettlebells"];

export interface GymTemplate {
  kind: GymKind;
  label: string;
  hint: string;
  equipment: string[];
}

export const GYM_TEMPLATES: GymTemplate[] = [
  { kind: "commerciale", label: "Grande salle commerciale", hint: "Machines, poulies, haltères, racks : à ajuster avec les photos de ta salle.", equipment: COMMERCIAL },
  { kind: "crossfit", label: "Salle de CrossFit", hint: "Barres, anneaux, rameur, box, kettlebells.", equipment: CROSSFIT },
  { kind: "home_gym", label: "Home gym", hint: "Haltères, banc, élastiques, barre de traction.", equipment: HOME },
  { kind: "poids_du_corps", label: "Poids du corps", hint: "Aucun matériel : seuls les exercices au poids du corps sont proposés.", equipment: [] },
];

export function templateFor(kind: GymKind): GymTemplate | null {
  return GYM_TEMPLATES.find((t) => t.kind === kind) ?? null;
}

// ── Faisabilité d'un exercice ────────────────────────────────────────────────

/** Tous les groupes doivent être satisfaits ; un groupe l'est si AU MOINS une clé est présente. */
export type Requirement = string[][];

const MACHINE_ANY = "@machine";
const MACHINE_KEYS = [
  "leg_press", "hack_squat", "pendulum_squat", "belt_squat", "leg_extension", "leg_curl_seated", "leg_curl_lying", "leg_curl_standing",
  "hip_thrust_machine", "glute_kickback_machine", "abductor_machine", "adductor_machine", "calf_standing", "calf_seated", "calf_donkey",
  "ghd", "back_extension", "reverse_hyper", "chest_press_machine", "pec_deck", "shoulder_press_machine", "lateral_raise_machine",
  "seated_row_machine", "tbar_row", "assisted_pullup_machine", "dip_machine", "biceps_curl_machine", "triceps_machine", "ab_machine", "smith",
];

const BENCH = ["flat_bench", "adjustable_bench"];

function norm(v: string): string {
  return v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

interface Rule {
  test: RegExp;
  needs: Requirement;
}

// Règles par nom (normalisé, sans accent), la première qui correspond gagne.
const NAME_RULES: Rule[] = [
  // Cardio et conditionnement
  { test: /rameur|rowing machine/, needs: [["rower"]] },
  { test: /tapis de course/, needs: [["treadmill"]] },
  { test: /elliptique/, needs: [["elliptical"]] },
  { test: /assault bike|airbike|velo stationnaire/, needs: [["bike"]] },
  { test: /stair climber/, needs: [["stair_climber"]] },
  { test: /ski erg/, needs: [["ski_erg"]] },
  { test: /sled|prowler/, needs: [["sled"]] },
  { test: /battle ropes|corde ondulatoire/, needs: [["battle_ropes"]] },
  { test: /corde a sauter|double under|sauts a la corde|simple under/, needs: [["jump_rope"]] },
  { test: /box jump|saut en hauteur sur box|depth jump|squat box/, needs: [["plyo_box", "flat_bench"]] },
  { test: /wall ball/, needs: [["medicine_ball"]] },
  { test: /tire flip|sandbag|sac de sable/, needs: [["strongman"]] },
  // Gymnastique
  { test: /anneaux|ring dips|ring push|muscle-up aux/, needs: [["rings"]] },
  { test: /traction.*elastique|muscle-up avec elastique|dips assistes elastique/, needs: [["pullup_bar", "dip_bars", "rings"], ["resistance_bands"]] },
  { test: /traction|muscle-up|front lever|back lever|toes to bar|hanging|suspendu|dead hang|suspension|skin the cat|human flag|drapeau/, needs: [["pullup_bar", "rings"]] },
  { test: /traction australienne|inverted row|rowing inverse/, needs: [["pullup_bar", "smith", "squat_rack", "rings"]] },
  { test: /dips triceps \(banc\)|pompes serrees sur banc/, needs: [BENCH] },
  { test: /dips/, needs: [["dip_bars", "dip_machine", "rings"]] },
  { test: /l-sit au sol \(parallettes\)/, needs: [["parallettes", "dip_bars"]] },
  // Barres spéciales
  { test: /trap bar|hex bar/, needs: [["trap_bar"]] },
  { test: /safety squat bar|ssb/, needs: [["safety_bar"], ["squat_rack"]] },
  { test: /landmine/, needs: [["barbell", "landmine"]] },
  { test: /smith/, needs: [["smith"]] },
  { test: /curl pupitre|larry scott|curl spider/, needs: [["preacher_bench", "adjustable_bench"], ["barbell", "ez_bar", "dumbbells"]] },
  { test: /barre ez|\bez\b/, needs: [["ez_bar", "barbell"]] },
  // Machines nommées
  { test: /pendulum|pendulaire/, needs: [["pendulum_squat"]] },
  { test: /hack squat/, needs: [["hack_squat"]] },
  { test: /belt squat/, needs: [["belt_squat"]] },
  { test: /presse a cuisses|leg press|mollets a la presse/, needs: [["leg_press"]] },
  { test: /leg extension/, needs: [["leg_extension"]] },
  { test: /leg curl couche/, needs: [["leg_curl_lying"]] },
  { test: /leg curl assis/, needs: [["leg_curl_seated"]] },
  { test: /leg curl debout/, needs: [["leg_curl_standing"]] },
  { test: /leg curl sur swiss ball/, needs: [["foam_roller"]] },
  { test: /leg curl/, needs: [["leg_curl_seated", "leg_curl_lying", "leg_curl_standing"]] },
  { test: /hip thrust machine/, needs: [["hip_thrust_machine"]] },
  { test: /kickback machine/, needs: [["glute_kickback_machine"]] },
  { test: /abduction hanche machine/, needs: [["abductor_machine"]] },
  { test: /machine adducteurs/, needs: [["adductor_machine"]] },
  { test: /mollets debout machine|mollets debout haltere/, needs: [["calf_standing", "dumbbells"]] },
  { test: /mollets assis machine/, needs: [["calf_seated"]] },
  { test: /mollets donkey/, needs: [["calf_donkey", "calf_standing"]] },
  { test: /glute-ham|ghr/, needs: [["ghd"]] },
  { test: /reverse hyperextension/, needs: [["reverse_hyper"]] },
  { test: /hyperextension/, needs: [["back_extension", "ghd"]] },
  { test: /reverse pec deck|pec deck|butterfly/, needs: [["pec_deck"]] },
  { test: /developpe epaules machine/, needs: [["shoulder_press_machine"]] },
  { test: /elevations laterales machine/, needs: [["lateral_raise_machine"]] },
  { test: /chest press|developpe a la machine|developpe incline machine|developpe decline machine/, needs: [["chest_press_machine"]] },
  { test: /rowing buste penche machine|machine tirage horizontal assis/, needs: [["seated_row_machine", "tbar_row"]] },
  { test: /curl machine/, needs: [["biceps_curl_machine"]] },
  { test: /extension triceps machine/, needs: [["triceps_machine"]] },
  { test: /crunch machine/, needs: [["ab_machine"]] },
  { test: /rowing t-bar/, needs: [["tbar_row", "landmine", "barbell"]] },
];

const POULIE_RULES: Rule[] = [
  { test: /tirage vertical|pulldown|pull-over poulie haute|bras tendus|lat stretch/, needs: [["lat_pulldown", "cable_station"]] },
  { test: /tirage horizontal|poulie basse|rowing haute/, needs: [["low_row", "cable_station"]] },
];

/** Ce qu'il faut pour faire cet exercice, d'après son nom et son champ matériel. */
export function requirementsFor(name: string, equipment: string | null): Requirement {
  const n = norm(name);
  const named = NAME_RULES.find((r) => r.test.test(n));
  if (named) return named.needs;

  const eq = equipment ? norm(equipment) : "";
  if (eq === "poulie") {
    const r = POULIE_RULES.find((x) => x.test.test(n));
    return r ? r.needs : [["cable_station", "lat_pulldown", "low_row"]];
  }
  if (eq === "smith machine") return [["smith"]];
  if (eq === "machine") return [[MACHINE_ANY]];
  if (eq === "kettlebell") return [["kettlebells"]];
  if (eq === "elastique") return [["resistance_bands"]];
  if (eq === "haltères" || eq === "halteres") {
    const needs: Requirement = [["dumbbells"]];
    if (/couche|incline|decline|ecarte couche|ecarte incline|pull-over haltere|curl incline|lu raises|poitrine/.test(n)) needs.push(BENCH);
    return needs;
  }
  if (eq === "barre") {
    const needs: Requirement = [["barbell"]];
    if (/chaine/.test(n)) needs.push(["chains"]);
    if (/bandes? elastique/.test(n)) needs.push(["resistance_bands"]);
    if (/hip thrust/.test(n)) needs.push(BENCH);
    else if (/floor press|board press|pin press/.test(n)) {
      // au sol ou sur butées : rien de plus
    } else if (/developpe (couche|incline|decline)|jm press|barre au front|skull|bench|spoto|chemise/.test(n)) needs.push(BENCH);
    else if (/squat|developpe militaire|developpe nuque|front squat|overhead squat|good morning/.test(n)) needs.push(["squat_rack"]);
    return needs;
  }
  return [];
}

/** Le test est volontairement tolérant : une clé inconnue de la salle compte comme absente. */
export function satisfies(requirement: Requirement, equipment: readonly string[]): boolean {
  const have = new Set(equipment);
  return requirement.every((group) =>
    group.some((key) => (key === MACHINE_ANY ? MACHINE_KEYS.some((k) => have.has(k)) : have.has(key)))
  );
}

export interface GymLike {
  kind?: GymKind | string | null;
  equipment?: readonly string[] | null;
}

/**
 * Les équipements à appliquer comme filtre pour une salle, ou null s'il ne faut
 * rien filtrer (salle absente, ou salle dont le matériel n'est pas renseigné).
 * Une salle « poids du corps » filtre avec une liste vide, volontairement.
 */
export function equipmentFilterFor(gym: GymLike | null | undefined): string[] | null {
  if (!gym) return null;
  const list = gym.equipment ?? [];
  if (list.length > 0) return [...list];
  return gym.kind === "poids_du_corps" ? [] : null;
}

/** Cet exercice est-il faisable avec ce matériel ? `null` = pas de filtre, donc oui. */
export function exerciseFeasible(ex: { name: string; equipment: string | null }, equipment: readonly string[] | null | undefined): boolean {
  if (!equipment) return true;
  return satisfies(requirementsFor(ex.name, ex.equipment), equipment);
}

/** Ce qui manque pour faire l'exercice (libellés), vide s'il est faisable. */
export function missingEquipment(ex: { name: string; equipment: string | null }, equipment: readonly string[]): string[] {
  const have = new Set(equipment);
  const out: string[] = [];
  for (const group of requirementsFor(ex.name, ex.equipment)) {
    if (group.some((key) => (key === MACHINE_ANY ? MACHINE_KEYS.some((k) => have.has(k)) : have.has(key)))) continue;
    out.push(group[0] === MACHINE_ANY ? "Une machine adaptée" : group.map(equipmentLabel).join(" ou "));
  }
  return out;
}

/** Garde les exercices faisables. Sans filtre, la liste est renvoyée telle quelle. */
export function filterFeasible<T extends { name: string; equipment: string | null }>(list: T[], equipment: readonly string[] | null | undefined): T[] {
  if (!equipment) return list;
  return list.filter((ex) => exerciseFeasible(ex, equipment));
}

/** Famille grossière (compat avec le filtre existant) déduite des équipements d'une salle. */
export function coarseTypesFor(equipment: readonly string[]): ReturnType<typeof getEquipmentType>[] {
  const have = new Set(equipment);
  const types = new Set<ReturnType<typeof getEquipmentType>>(["poids_du_corps", "autre"]);
  if (MACHINE_KEYS.some((k) => have.has(k))) types.add("machine");
  if (have.has("cable_station") || have.has("lat_pulldown") || have.has("low_row")) types.add("poulie");
  if (have.has("barbell") || have.has("dumbbells") || have.has("kettlebells")) types.add("poids_libre");
  return [...types];
}
