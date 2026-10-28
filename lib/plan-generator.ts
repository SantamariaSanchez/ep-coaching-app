import type { ClientIntake } from "@/utils/client-intake";
import type { LibraryExercise } from "@/utils/exercise-library";
import type { RoadmapPhase, RoadmapObjective } from "@/utils/roadmap";
import { getEquipmentType, type EquipmentType } from "@/lib/exercise-library-content";
import {
  computeMacroTargets,
  restSecondsFor,
  sessionSetBudget,
  weeklySetsForMuscle,
  weeklySetsCeilingFor,
  recoveryStatusFrom,
  SMALL_MUSCLE_GROUPS,
  type RecoveryStatus,
  type TrainingLevel,
} from "@/lib/coaching-knowledge";
import { deficitAllowed, eatingSafetyLevel, type EatingRelation } from "@/lib/eating-safety";
import {
  crossGroupCandidates,
  injuryAvoidKeywords,
  isHeavyLift,
  isTrainingExercise,
  rankCandidates,
  type SlotCategory,
} from "@/lib/exercise-selection";

// ── Accès matériel réel du client ───────────────────────────────────────────
// Racine du bug remonté : rien dans l'app ne savait si un client s'entraîne
// en salle ou à la maison, donc les suggestions (et le picker manuel)
// proposaient des machines à des clients qui n'ont jamais mis les pieds
// dans une salle. Un seul point de vérité ici, réutilisé par le générateur
// de suggestions ET par la vérification de conflit du constructeur manuel.

export type TrainingAccess = NonNullable<ClientIntake["training_access"]>;

export const TRAINING_ACCESS_LABELS: Record<TrainingAccess, string> = {
  salle: "en salle de sport",
  domicile_equipe: "à la maison, avec du matériel",
  domicile_minimal: "à la maison, sans matériel",
};

const ALL_EQUIPMENT_TYPES: EquipmentType[] = ["machine", "poulie", "poids_libre", "poids_du_corps", "autre"];

export function allowedEquipmentTypes(access: ClientIntake["training_access"]): EquipmentType[] {
  if (access === "salle") return ALL_EQUIPMENT_TYPES;
  if (access === "domicile_equipe") return ["poids_libre", "poids_du_corps", "autre"];
  if (access === "domicile_minimal") return ["poids_du_corps", "autre"];
  // Fiche pas encore renseignée : ne rien filtrer plutôt que de bloquer à
  // tort (comportement identique à avant l'ajout du champ).
  return ALL_EQUIPMENT_TYPES;
}

// ── Phase inference ──────────────────────────────────────────────────────────

export type InferredPhase = "deficit" | "maintenance" | "surplus";

export function inferPhase(intake: ClientIntake): InferredPhase {
  const text = `${intake.goal_3_months ?? ""} ${intake.goal_12_months ?? ""}`.toLowerCase();
  if (/sec|sèch|deficit|défic|maigr|perte/.test(text)) return "deficit";
  if (/massif|prise|surplus|gain|muscl/.test(text)) return "surplus";
  return "maintenance";
}

export function ageFromDateOfBirth(dob: string): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

// "Plus de 90 min" / "60-90 min" / "45 min" → minutes numériques, sinon 60.
export function parseSessionDuration(text: string | null): number {
  if (!text) return 60;
  const numbers = text.match(/\d+/g);
  if (!numbers) return 60;
  const nums = numbers.map(Number);
  return nums.length > 1 ? Math.round((nums[0] + nums[1]) / 2) : nums[0];
}

// ── Nutrition targets — reproduit exactement la formule de NutritionForm.tsx
// (Mifflin-St Jeor + EAT + NEAT + TEF) côté serveur pour l'auto-génération.

export interface GeneratedNutritionTargets {
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  tdee: number;
  bmr: number;
  /** Phase réellement appliquée : peut différer de celle demandée par prudence. */
  phaseApplied: InferredPhase;
  /** Pourquoi la phase demandée a été remplacée, le cas échéant (jamais montré tel quel à un client). */
  note: string | null;
}

export function computeNutritionTargets(params: {
  gender: "Homme" | "Femme" | "Autre" | null;
  weightKg: number;
  heightCm: number;
  age: number;
  sessionsPerWeek: number;
  sessionDurationMin: number;
  stepsPerDay: number;
  phase: InferredPhase;
  /** Niveau d'entraînement : un profil avancé a un déficit plus prudent (15 %). */
  level?: TrainingLevel;
  /** Relation à l'alimentation déclarée : « actuel » ou « incertain » interdit tout déficit chiffré. */
  eatingRelation?: EatingRelation | null;
}): GeneratedNutritionTargets {
  const { weightKg: w, heightCm: h, age: a } = params;
  const bmr = params.gender === "Femme" ? 10 * w + 6.25 * h - 5 * a - 161 : 10 * w + 6.25 * h - 5 * a + 5;

  const kcalPerHour = 45; // "Musculation" par défaut — cohérent avec l'app coaching muscu
  const eat = (kcalPerHour * (params.sessionDurationMin / 60) * params.sessionsPerWeek) / 7;
  const neat = params.stepsPerDay * 0.04;
  const tef = 0.1 * (bmr + eat + neat);
  const tdee = bmr + eat + neat + tef;

  // Sécurité d'abord : pas de déficit chiffré en cas de signal de trouble
  // alimentaire (lib/eating-safety.ts). Aucun traitement lié à l'âge : le
  // bilan énergétique dépend de la dépense et de l'apport.
  let phase = params.phase;
  let note: string | null = null;
  if (phase === "deficit") {
    if (!deficitAllowed(eatingSafetyLevel(params.eatingRelation))) {
      phase = "maintenance";
      note = "Relation à l'alimentation signalée : maintenance proposée, aucun déficit chiffré.";
    }
  }

  // Ajustement en % de la maintenance, protéines et lipides au poids de
  // corps, glucides = le reste (règles partagées : lib/coaching-knowledge.ts).
  const { calories, proteins, fats, carbs } = computeMacroTargets({ weightKg: w, tdee, phase, level: params.level });

  return { calories, proteins, carbs, fats, tdee: Math.round(tdee), bmr: Math.round(bmr), phaseApplied: phase, note };
}

// ── Programme d'entraînement — split par nombre de séances/semaine ──────────

type SlotPriority = 1 | 2 | 3;

interface Slot {
  group: string;
  category: SlotCategory;
  /** 1 : indispensable, 2 : utile, 3 : retiré en premier quand le temps manque. */
  priority: SlotPriority;
}

interface DayTemplate {
  label: string;
  slots: Slot[];
}

const c = (group: string, priority: SlotPriority): Slot => ({ group, category: "compose", priority });
const i = (group: string, priority: SlotPriority): Slot => ({ group, category: "isolation", priority });

const PEC = "Pectoraux";
const BACK = "Dos";
const SHO = "Épaules";
const BIC = "Biceps";
const TRI = "Triceps";
const QUA = "Quadriceps";
const HAM = "Ischio-jambiers";
const GLU = "Fessiers";
const CAL = "Mollets";

// Un split par nombre de séances. Règles : composés d'abord puis isolation,
// groupes prioritaires en premier, chaque grand muscle revient deux fois par
// semaine dès 3 séances (le Mastermind enseigne 2 à 3 ; à volume égal, la
// fréquence est surtout une question de préférence et de récupération).
// À 2 séances, tout le corps est travaillé à chaque fois.
const SPLIT_TEMPLATES: Record<number, DayTemplate[]> = {
  2: [
    { label: "Full Body A", slots: [c(QUA, 1), c(PEC, 1), c(BACK, 1), i(HAM, 1), i(SHO, 2), i(TRI, 3)] },
    { label: "Full Body B", slots: [c(HAM, 1), c(BACK, 1), c(PEC, 1), c(GLU, 2), i(QUA, 2), i(BIC, 3)] },
  ],
  3: [
    { label: "Haut du corps", slots: [c(PEC, 1), c(BACK, 1), c(SHO, 2), i(SHO, 2), i(BIC, 2), i(TRI, 2)] },
    { label: "Bas du corps", slots: [c(QUA, 1), c(HAM, 1), c(GLU, 2), i(HAM, 2), i(CAL, 3), i(QUA, 3)] },
    { label: "Corps entier", slots: [c(QUA, 1), c(BACK, 1), c(PEC, 1), i(HAM, 1), i(SHO, 2), i(TRI, 3)] },
  ],
  4: [
    { label: "Haut du corps A", slots: [c(PEC, 1), c(BACK, 1), c(SHO, 2), i(PEC, 2), i(TRI, 2), i(BIC, 2)] },
    { label: "Bas du corps A", slots: [c(QUA, 1), c(HAM, 1), c(GLU, 2), i(QUA, 2), i(CAL, 3)] },
    { label: "Haut du corps B", slots: [c(BACK, 1), c(PEC, 1), i(SHO, 1), i(BACK, 2), i(BIC, 2), i(TRI, 2)] },
    { label: "Bas du corps B", slots: [c(GLU, 1), c(QUA, 1), i(HAM, 1), i(HAM, 2), i(CAL, 3)] },
  ],
  5: [
    { label: "Push", slots: [c(PEC, 1), c(SHO, 1), i(PEC, 2), i(SHO, 2), i(TRI, 2)] },
    { label: "Pull", slots: [c(BACK, 1), c(BACK, 1), i(BIC, 2), i(SHO, 2)] },
    { label: "Legs", slots: [c(QUA, 1), c(HAM, 1), c(GLU, 2), i(HAM, 2), i(CAL, 3)] },
    { label: "Haut du corps", slots: [c(PEC, 1), c(BACK, 1), i(SHO, 2), i(BIC, 2), i(TRI, 2)] },
    { label: "Bas du corps", slots: [c(QUA, 1), c(GLU, 1), i(HAM, 1), i(QUA, 2), i(CAL, 3)] },
  ],
  6: [
    { label: "Push A", slots: [c(PEC, 1), c(SHO, 1), i(PEC, 2), i(TRI, 2), i(SHO, 2)] },
    { label: "Pull A", slots: [c(BACK, 1), c(BACK, 1), i(BIC, 2), i(SHO, 2)] },
    { label: "Legs A", slots: [c(QUA, 1), c(HAM, 1), c(GLU, 2), i(CAL, 3)] },
    { label: "Push B", slots: [c(PEC, 1), c(SHO, 1), i(SHO, 2), i(TRI, 2), i(PEC, 2)] },
    { label: "Pull B", slots: [c(BACK, 1), i(BACK, 2), i(BIC, 2), i(SHO, 2)] },
    { label: "Legs B", slots: [c(GLU, 1), c(QUA, 1), i(HAM, 1), i(QUA, 2), i(CAL, 3)] },
  ],
};

function clampSessions(n: number): number {
  return Math.min(6, Math.max(2, Math.round(n)));
}

// Filtre les mots-clés (équipement détesté, exercices problématiques) contre
// le nom et l'équipement de chaque exercice — approximation volontairement
// permissive (substring match) plutôt que de rater un exercice à exclure.
function isExcluded(ex: LibraryExercise, excludeText: string): boolean {
  if (!excludeText.trim()) return false;
  const keywords = excludeText
    .toLowerCase()
    .split(/[,;\n]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 2);
  const haystack = `${ex.name} ${ex.equipment ?? ""}`.toLowerCase();
  return keywords.some((k) => haystack.includes(k));
}

/** Texte d'exclusion complet : déclarations libres + précautions mécaniques tirées des blessures. */
export function buildExcludeText(disliked: string | null, problematic: string | null, injuries: string | null): string {
  return [disliked ?? "", problematic ?? "", injuries ?? "", injuryAvoidKeywords(injuries).join(",")].join(",");
}

// ── Vérification de compatibilité exercice / client ─────────────────────────
// Utilisé dans le constructeur de programme : avant d'ajouter un exercice,
// on croise son nom/matériel avec les contraintes déclarées dans la fiche
// client (blessures, exercices problématiques, matériel détesté) + toute
// contrainte que le coach ajoute lui-même sur le moment si la fiche est
// incomplète. Pas un blocage silencieux (comme dans le générateur de
// suggestions) : ici le coach voit exactement pourquoi et décide.

export type ConflictSource = "injuries" | "exercises_problematic" | "disliked_equipment" | "equipment_access" | "custom";

export interface ExerciseConflict {
  source: ConflictSource;
  keyword: string;
}

const CONFLICT_SOURCE_LABEL: Record<ConflictSource, string> = {
  injuries: "Blessure/douleur déclarée",
  exercises_problematic: "Exercice signalé comme problématique",
  disliked_equipment: "Matériel détesté déclaré",
  equipment_access: "Matériel indisponible pour ce client",
  custom: "Contrainte ajoutée par toi",
};

export function conflictSourceLabel(source: ConflictSource): string {
  return CONFLICT_SOURCE_LABEL[source];
}

function findKeywordMatches(haystack: string, text: string): string[] {
  if (!text.trim()) return [];
  const keywords = text
    .toLowerCase()
    .split(/[,;\n]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 2);
  return keywords.filter((k) => haystack.includes(k));
}

export function checkExerciseConflicts(
  ex: { name: string; equipment: string | null },
  intake: Pick<ClientIntake, "injuries" | "exercises_problematic" | "disliked_equipment" | "training_access"> | null,
  customConstraints: string,
  // Types de matériel écartés à la main par le coach dans l'inventaire de
  // la séance de programmation (ex. cette salle précise manque de poulies
  // aux heures où le client s'entraîne) — un raffinement au-dessus du filtre
  // automatique par lieu d'entraînement, pas à sa place.
  extraExcludedEquipment: EquipmentType[] = []
): ExerciseConflict[] {
  const haystack = `${ex.name} ${ex.equipment ?? ""}`.toLowerCase();
  const conflicts: ExerciseConflict[] = [];

  const sources: [ConflictSource, string | null][] = [
    ["injuries", intake?.injuries ?? null],
    ["exercises_problematic", intake?.exercises_problematic ?? null],
    ["disliked_equipment", intake?.disliked_equipment ?? null],
    ["custom", customConstraints],
  ];
  for (const [source, text] of sources) {
    if (!text) continue;
    for (const keyword of findKeywordMatches(haystack, text)) {
      conflicts.push({ source, keyword });
    }
  }

  // Matériel physiquement indisponible pour ce client (ex. machine suggérée
  // à quelqu'un qui s'entraîne à la maison) — un vrai empêchement, pas une
  // préférence, donc vérifié même sans mot-clé déclaré.
  if (intake?.training_access) {
    const allowed = allowedEquipmentTypes(intake.training_access);
    const type = getEquipmentType(ex.equipment);
    if (!allowed.includes(type)) {
      conflicts.push({
        source: "equipment_access",
        keyword: `${ex.equipment ?? "Matériel"} : client ${TRAINING_ACCESS_LABELS[intake.training_access]}`,
      });
    }
  }

  if (extraExcludedEquipment.length > 0) {
    const type = getEquipmentType(ex.equipment);
    if (extraExcludedEquipment.includes(type)) {
      conflicts.push({
        source: "equipment_access",
        keyword: `${ex.equipment ?? "Matériel"} : écarté dans l'inventaire matériel de cette séance de conception`,
      });
    }
  }

  return conflicts;
}

export interface ExerciseSuggestion {
  name: string;
  category: "compose" | "isolation" | null;
  difficulty: string | null;
  equipment: string | null;
  muscleSubgroup: string | null;
  reason: string;
}

function toSuggestion(ex: LibraryExercise, trainingAccess: ClientIntake["training_access"]): ExerciseSuggestion {
  const diffLabel =
    ex.difficulty === "debutant" ? "débutant" : ex.difficulty === "avance" ? "avancé, vérifie la maîtrise technique" : "intermédiaire";
  const parts = [
    `${ex.category === "compose" ? "Mouvement composé" : "Isolation"}, niveau ${diffLabel}${ex.muscle_subgroup ? ` (cible ${ex.muscle_subgroup})` : ""}.`,
  ];
  // Justifie le choix par rapport à la situation réelle du client, pas
  // seulement par les qualités intrinsèques de l'exercice — c'était le
  // reproche exact : des suggestions "vraies dans l'absolu" mais fausses
  // pour CE client précis (matériel qu'il n'a pas).
  if (trainingAccess) {
    const type = getEquipmentType(ex.equipment);
    if (trainingAccess === "salle") {
      parts.push(`Nécessite : ${ex.equipment ?? "matériel de salle"}.`);
    } else if (type === "poids_du_corps" || type === "autre") {
      parts.push(`Faisable ${TRAINING_ACCESS_LABELS[trainingAccess]}.`);
    }
  }
  return {
    name: ex.name,
    category: ex.category,
    difficulty: ex.difficulty,
    equipment: ex.equipment,
    muscleSubgroup: ex.muscle_subgroup,
    reason: parts.join(" "),
  };
}

export interface MuscleGroupSuggestion {
  group: string;
  compound: ExerciseSuggestion[];
  isolation: ExerciseSuggestion[];
}

// Point commun entre les suggestions (plusieurs pistes) et la génération
// (un choix ferme) : mêmes règles d'éligibilité (groupe, exclusions,
// blessures, matériel disponible, vrais exercices d'entraînement), classés
// selon les critères de sélection du Mastermind et le niveau de la personne
// (lib/exercise-selection.ts).
function filteredCandidates(
  library: LibraryExercise[],
  group: string,
  category: SlotCategory,
  excludeText: string,
  allowed: EquipmentType[],
  level: TrainingLevel = "intermediaire"
): LibraryExercise[] {
  const own = library.filter((ex) => ex.muscle_group === group && ex.category === category);
  const pool = [...own, ...crossGroupCandidates(library, group, category)];
  const eligible = pool.filter(
    (ex) => isTrainingExercise(ex) && !isExcluded(ex, excludeText) && allowed.includes(getEquipmentType(ex.equipment))
  );
  return rankCandidates(eligible, group, category, level);
}

// Renvoie plusieurs candidats par catégorie (pas un choix figé) — le but est
// de suggérer des options que le coach compare et choisit lui-même, jamais
// de décider à sa place.
function suggestForGroup(
  library: LibraryExercise[],
  group: string,
  excludeText: string,
  trainingAccess: ClientIntake["training_access"],
  level: TrainingLevel,
  maxPerCategory = 3
): MuscleGroupSuggestion {
  const allowed = allowedEquipmentTypes(trainingAccess);
  const compound = filteredCandidates(library, group, "compose", excludeText, allowed, level).slice(0, maxPerCategory);
  const isolation = filteredCandidates(library, group, "isolation", excludeText, allowed, level).slice(0, maxPerCategory);

  return {
    group,
    compound: compound.map((ex) => toSuggestion(ex, trainingAccess)),
    isolation: isolation.map((ex) => toSuggestion(ex, trainingAccess)),
  };
}

export interface ProgramSuggestion {
  dayLabel: string;
  groups: MuscleGroupSuggestion[];
}

// Suggestions pures, jamais un programme prêt à sauvegarder — pas de sets/reps
// prescrits : le coach construit le programme lui-même (via le picker normal)
// et pioche dans ces pistes s'il veut. Les blessures déclarées écartent les
// mouvements qui sollicitent le plus la zone (précaution, jamais un diagnostic).
export function buildProgramSuggestions(
  sessionsPerWeek: number,
  library: LibraryExercise[],
  dislikedEquipment: string | null,
  exercisesProblematic: string | null,
  trainingAccess: ClientIntake["training_access"] = null,
  injuries: string | null = null,
  level: TrainingLevel = "intermediaire"
): ProgramSuggestion[] {
  const template = SPLIT_TEMPLATES[clampSessions(sessionsPerWeek)];
  const excludeText = buildExcludeText(dislikedEquipment, exercisesProblematic, injuries);

  return template.map((day) => {
    const groups = [...new Set(day.slots.map((sl) => sl.group))];
    return {
      dayLabel: day.label,
      groups: groups.map((group) => suggestForGroup(library, group, excludeText, trainingAccess, level)),
    };
  });
}

// ── Génération d'un brouillon complet ───────────────────────────────────────
// Contrairement à buildProgramSuggestions (des pistes à copier à la main),
// ceci choisit UN exercice par créneau avec un jeu série/reps/repos par
// défaut et renvoie des jours directement injectables dans l'éditeur —
// un vrai point de départ éditable, pas une liste à retranscrire.

export interface GeneratedExercise {
  name: string;
  muscle_group: string;
  muscle_subgroup: string | null;
  sets: string;
  reps: string;
  rir: string;
  rest_seconds: string;
  is_direct: boolean;
}

export interface GeneratedDay {
  dayLabel: string;
  exercises: GeneratedExercise[];
}

export interface ProgramPlanOptions {
  /** Niveau d'entraînement ; intermédiaire si inconnu. */
  level?: TrainingLevel;
  /** Récupération estimée (sommeil, stress) ; normale si inconnue. */
  recovery?: RecoveryStatus;
  /** Durée possible d'une séance, en minutes ; 60 si inconnue. */
  sessionMinutes?: number | null;
}

export interface GeneratedProgramPlan {
  days: GeneratedDay[];
  level: TrainingLevel;
  recovery: RecoveryStatus;
  /** Séries directes par groupe sur la semaine. */
  weeklySetsByGroup: Record<string, number>;
  /** Le temps disponible a obligé à réduire le volume sous la cible de départ. */
  timeLimited: boolean;
  /** Constats lisibles pour le coach (jamais affichés tels quels à un client). */
  notes: string[];
}

const MIN_SETS_PER_SLOT = 2;
const MAX_SETS_PER_SLOT = 6;
const COMPOUND_WEIGHT = 1.3;

function slotWeight(sl: Slot): number {
  return sl.category === "compose" ? COMPOUND_WEIGHT : 1;
}

/** Répartit la cible hebdomadaire d'un groupe sur ses créneaux (plus de séries sur les polyarticulaires). */
function allocateSets(slots: { slot: Slot }[], target: number): number[] {
  const total = slots.reduce((sum, { slot }) => sum + slotWeight(slot), 0);
  if (total === 0) return [];
  const raw = slots.map(({ slot }) => (target * slotWeight(slot)) / total);
  const out = raw.map((r) => Math.floor(r));
  let left = Math.round(target) - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, idx) => ({ idx, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; left > 0 && k < order.length * 2; k++, left--) out[order[k % order.length].idx] += 1;
  return out.map((n) => Math.min(MAX_SETS_PER_SLOT, Math.max(MIN_SETS_PER_SLOT, n)));
}

function prescription(
  category: SlotCategory,
  name: string,
  level: TrainingLevel,
  timeLimited: boolean
): Pick<GeneratedExercise, "reps" | "rir" | "rest_seconds"> {
  const beginner = level === "debutant";
  if (category === "isolation") {
    return {
      reps: beginner ? "12-15" : "10-15",
      // Un débutant sous-estime sa proximité de l'échec : on vise 2 à 3.
      rir: beginner ? "2" : "1",
      rest_seconds: String(restSecondsFor("isolation", { timeLimited })),
    };
  }
  return {
    reps: beginner ? "8-12" : "6-10",
    rir: beginner ? "3" : "2",
    rest_seconds: String(restSecondsFor("compound", { heavy: isHeavyLift(name), timeLimited })),
  };
}

/**
 * Programme de départ personnalisé : split selon la fréquence, volume de
 * départ selon le niveau et la récupération, tenu dans le temps de séance
 * possible, exercices selon le matériel, les blessures et le niveau.
 */
export function generateProgramPlan(
  sessionsPerWeek: number,
  library: LibraryExercise[],
  dislikedEquipment: string | null,
  exercisesProblematic: string | null,
  trainingAccess: ClientIntake["training_access"] = null,
  injuries: string | null = null,
  options: ProgramPlanOptions = {}
): GeneratedProgramPlan {
  const level = options.level ?? "intermediaire";
  const recovery = options.recovery ?? "normal";
  const template = SPLIT_TEMPLATES[clampSessions(sessionsPerWeek)];
  const excludeText = buildExcludeText(dislikedEquipment, exercisesProblematic, injuries);
  const allowed = allowedEquipmentTypes(trainingAccess);
  const budget = sessionSetBudget(options.sessionMinutes);
  const notes: string[] = [];

  // Créneaux retenus par jour (copie : on peut en retirer quand le temps manque).
  const days = template.map((d) => ({ label: d.label, slots: [...d.slots] }));

  // Volume hebdomadaire visé par groupe (départ selon niveau et récupération).
  const groups = [...new Set(days.flatMap((d) => d.slots.map((sl) => sl.group)))];
  const targetOf = (g: string) => weeklySetsForMuscle(g, level, recovery);

  const setsFor = (): Map<Slot, number> => {
    const map = new Map<Slot, number>();
    for (const g of groups) {
      const slots = days.flatMap((d) => d.slots.filter((sl) => sl.group === g).map((slot) => ({ slot })));
      if (slots.length === 0) continue;
      allocateSets(slots, targetOf(g)).forEach((n, idx) => map.set(slots[idx].slot, n));
    }
    return map;
  };

  let sets = setsFor();
  const dayTotal = (d: { slots: Slot[] }) => d.slots.reduce((sum, sl) => sum + (sets.get(sl) ?? 0), 0);

  // Trop long pour le temps possible : on retire d'abord les créneaux
  // facultatifs (priorité 3), puis on réduit le volume proportionnellement
  // plutôt que de supprimer des muscles, sans descendre sous 2 séries par
  // exercice. Le coach en est averti.
  let timeLimited = false;
  for (let guard = 0; guard < 40; guard++) {
    const over = days.find((d) => dayTotal(d) > budget && d.slots.some((sl) => sl.priority === 3));
    if (!over) break;
    const removable = over.slots.filter((sl) => sl.priority === 3).slice(-1)[0];
    over.slots.splice(over.slots.indexOf(removable), 1);
    sets = setsFor();
    timeLimited = true;
  }
  for (const d of days) {
    if (dayTotal(d) <= budget) continue;
    timeLimited = true;
    // D'abord les petits muscles, qui reçoivent déjà du travail indirect.
    const small = d.slots.filter((sl) => SMALL_MUSCLE_GROUPS.includes(sl.group));
    for (let guard = 0; guard < 60 && dayTotal(d) > budget; guard++) {
      const reducible = small.filter((sl) => (sets.get(sl) ?? 0) > MIN_SETS_PER_SLOT).sort((a, b) => (sets.get(b) ?? 0) - (sets.get(a) ?? 0))[0];
      if (!reducible) break;
      sets.set(reducible, (sets.get(reducible) ?? 0) - 1);
    }
    // Puis le reste, un peu partout, sans descendre sous le minimum par exercice.
    for (let guard = 0; guard < 80 && dayTotal(d) > budget; guard++) {
      const reducible = d.slots.filter((sl) => (sets.get(sl) ?? 0) > MIN_SETS_PER_SLOT).sort((a, b) => (sets.get(b) ?? 0) - (sets.get(a) ?? 0))[0];
      if (!reducible) break;
      sets.set(reducible, (sets.get(reducible) ?? 0) - 1);
    }
  }

  const rotation: Record<string, number> = {};
  const used: Set<string>[] = days.map(() => new Set());
  const missing = new Set<string>();

  function pick(group: string, category: SlotCategory, dayIdx: number, avoidPosition?: string | null): LibraryExercise | null {
    const candidates = filteredCandidates(library, group, category, excludeText, allowed, level).filter((ex) => !used[dayIdx].has(ex.name));
    if (candidates.length === 0) return null;
    const pool = avoidPosition ? candidates.filter((x) => x.position !== avoidPosition) : candidates;
    const usable = pool.length > 0 ? pool : candidates;
    const key = `${group}:${category}`;
    const idx = (rotation[key] ?? 0) % usable.length;
    rotation[key] = (rotation[key] ?? 0) + 1;
    return usable[idx];
  }

  const weeklySetsByGroup: Record<string, number> = {};
  const outDays: GeneratedDay[] = days.map((d, dayIdx) => {
    const exercises: GeneratedExercise[] = [];
    // Composés d'abord (muscles prioritaires en tête), isolation ensuite.
    const ordered = [...d.slots].sort((a, b) => (a.category === b.category ? a.priority - b.priority : a.category === "compose" ? -1 : 1));
    for (const sl of ordered) {
      const ex = pick(sl.group, sl.category, dayIdx);
      if (!ex) {
        missing.add(sl.group);
        continue;
      }
      used[dayIdx].add(ex.name);
      const n = sets.get(sl) ?? MIN_SETS_PER_SLOT;
      weeklySetsByGroup[sl.group] = (weeklySetsByGroup[sl.group] ?? 0) + n;
      exercises.push({
        name: ex.name,
        muscle_group: ex.muscle_group,
        muscle_subgroup: ex.muscle_subgroup,
        sets: String(n),
        is_direct: true,
        ...prescription(sl.category, ex.name, level, timeLimited),
      });
    }
    return { dayLabel: d.label, exercises };
  });

  if (timeLimited) {
    notes.push("Le temps de séance disponible limite le volume : les repos sont au bas de la fourchette et les séries sont réduites. Plus de temps ou une séance de plus permet de monter.");
  }
  if (missing.size > 0) {
    notes.push(`Aucun exercice compatible trouvé pour : ${[...missing].join(", ")} (matériel ou précautions). À compléter à la main.`);
  }
  if (injuryAvoidKeywords(injuries).length > 0) {
    notes.push("Des mouvements sollicitant la zone douloureuse déclarée ont été écartés par précaution. Ce n'est pas un diagnostic : un avis médical reste nécessaire.");
  }
  const ceiling = weeklySetsCeilingFor(level);
  for (const [g, n] of Object.entries(weeklySetsByGroup)) {
    if (n > ceiling) notes.push(`${g} dépasse ${ceiling} séries par semaine pour ce niveau, à vérifier.`);
  }

  return { days: outDays, level, recovery, weeklySetsByGroup, timeLimited, notes };
}

export function generateProgramDraft(
  sessionsPerWeek: number,
  library: LibraryExercise[],
  dislikedEquipment: string | null,
  exercisesProblematic: string | null,
  trainingAccess: ClientIntake["training_access"] = null,
  injuries: string | null = null,
  options: ProgramPlanOptions = {}
): GeneratedDay[] {
  return generateProgramPlan(sessionsPerWeek, library, dislikedEquipment, exercisesProblematic, trainingAccess, injuries, options).days;
}

/** Récupération estimée à partir de la fiche client (sommeil, stress). */
export function recoveryFromIntake(intake: Pick<ClientIntake, "sleep_hours" | "sleep_quality" | "stress_level"> | null): RecoveryStatus {
  if (!intake) return "normal";
  return recoveryStatusFrom({ sleepHours: intake.sleep_hours, sleepQuality: intake.sleep_quality, stressLevel: intake.stress_level });
}

/** Niveau d'entraînement à partir du quiz d'onboarding (« confirmé » = avancé). */
export function levelFromExperience(experience: "debutant" | "intermediaire" | "confirme" | null | undefined): TrainingLevel {
  if (experience === "debutant") return "debutant";
  if (experience === "confirme") return "avance";
  return "intermediaire";
}

// Remplace un exercice par le candidat suivant du même groupe/catégorie —
// utilisé par le bouton "remplacer" de l'éditeur pour itérer exercice par
// exercice sans tout régénérer. `excludeNames` évite de retomber sur un
// exercice déjà utilisé ailleurs dans la même séance. Les blessures
// déclarées écartent aussi les candidats, comme à la génération.
export function findSwapCandidate(
  current: { muscle_group: string; category: "compose" | "isolation" | null },
  library: LibraryExercise[],
  dislikedEquipment: string | null,
  exercisesProblematic: string | null,
  injuries: string | null,
  trainingAccess: ClientIntake["training_access"],
  excludeNames: string[],
  level: TrainingLevel = "intermediaire"
): LibraryExercise | null {
  if (!current.category) return null;
  const excludeText = buildExcludeText(dislikedEquipment, exercisesProblematic, injuries);
  const allowed = allowedEquipmentTypes(trainingAccess);
  const candidates = filteredCandidates(library, current.muscle_group, current.category, excludeText, allowed, level).filter(
    (ex) => !excludeNames.includes(ex.name)
  );
  return candidates[0] ?? null;
}

// ── Road map — une phase + objectifs dérivés des buts déclarés ──────────────

export interface RoadmapPayload {
  start_date: string;
  end_date: string;
  phases: Omit<RoadmapPhase, "id" | "roadmap_id">[];
  objectives: Omit<RoadmapObjective, "id" | "roadmap_id">[];
}

const PHASE_TYPE: Record<InferredPhase, string> = {
  deficit: "deficit",
  surplus: "masse",
  maintenance: "maintenance",
};

const PHASE_LABEL: Record<InferredPhase, string> = {
  deficit: "Perte de gras (déficit)",
  surplus: "Prise de muscle",
  maintenance: "Maintenance",
};

function isoPlusWeeks(date: Date, weeks: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split("T")[0];
}

export function buildRoadmapPayload(intake: ClientIntake, phase: InferredPhase, today = new Date()): RoadmapPayload {
  const startDate = today.toISOString().split("T")[0];
  const midDate = isoPlusWeeks(today, 12);
  const endDate = isoPlusWeeks(today, 52);

  const objectives: Omit<RoadmapObjective, "id" | "roadmap_id">[] = [];
  if (intake.goal_3_months) {
    objectives.push({
      type: "custom",
      label: intake.goal_3_months.slice(0, 80),
      target_date: midDate,
      target_value: null,
      target_unit: null,
      description: intake.goal_3_months,
      term: "short",
      is_achieved: false,
      achieved_at: null,
    });
  }
  if (intake.goal_12_months) {
    objectives.push({
      type: "custom",
      label: intake.goal_12_months.slice(0, 80),
      target_date: endDate,
      target_value: null,
      target_unit: null,
      description: intake.goal_12_months,
      term: "long",
      is_achieved: false,
      achieved_at: null,
    });
  }

  return {
    start_date: startDate,
    end_date: endDate,
    phases: [
      {
        type: PHASE_TYPE[phase],
        label: PHASE_LABEL[phase],
        start_date: startDate,
        end_date: endDate,
        notes: "Phase générée automatiquement depuis la fiche client, à ajuster.",
        position: 0,
      },
    ],
    objectives,
  };
}
