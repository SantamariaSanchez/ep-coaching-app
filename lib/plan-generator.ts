import type { ClientIntake } from "@/utils/client-intake";
import type { LibraryExercise } from "@/utils/exercise-library";
import type { RoadmapPhase, RoadmapObjective } from "@/utils/roadmap";

// ── Phase inference ──────────────────────────────────────────────────────────

export type InferredPhase = "deficit" | "maintenance" | "surplus";

export function inferPhase(intake: ClientIntake): InferredPhase {
  const text = `${intake.goal_3_months ?? ""} ${intake.goal_12_months ?? ""}`.toLowerCase();
  if (/sec|sèch|deficit|défic|maigr|perte/.test(text)) return "deficit";
  if (/massif|prise|surplus|gain|muscl/.test(text)) return "surplus";
  return "maintenance";
}

const PHASE_ADJUSTMENT: Record<InferredPhase, number> = {
  deficit: -400,
  maintenance: 0,
  surplus: 300,
};

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
}): GeneratedNutritionTargets {
  const { weightKg: w, heightCm: h, age: a } = params;
  const bmr = params.gender === "Femme" ? 10 * w + 6.25 * h - 5 * a - 161 : 10 * w + 6.25 * h - 5 * a + 5;

  const kcalPerHour = 45; // "Musculation" par défaut — cohérent avec l'app coaching muscu
  const eat = (kcalPerHour * (params.sessionDurationMin / 60) * params.sessionsPerWeek) / 7;
  const neat = params.stepsPerDay * 0.04;
  const tef = 0.1 * (bmr + eat + neat);
  const tdee = bmr + eat + neat + tef;

  const calories = Math.round(tdee + PHASE_ADJUSTMENT[params.phase]);
  const proteins = Math.round(2.0 * w);
  const fats = Math.round(1.0 * w);
  const carbs = Math.max(0, Math.round((calories - proteins * 4 - fats * 9) / 4));

  return { calories, proteins, carbs, fats, tdee: Math.round(tdee), bmr: Math.round(bmr) };
}

// ── Programme d'entraînement — split par nombre de séances/semaine ──────────

interface DayTemplate {
  label: string;
  groups: string[];
}

const SPLIT_TEMPLATES: Record<number, DayTemplate[]> = {
  2: [
    { label: "Full Body A", groups: ["Quadriceps", "Pectoraux", "Dos", "Épaules"] },
    { label: "Full Body B", groups: ["Ischio-jambiers", "Dos", "Pectoraux", "Biceps", "Triceps"] },
  ],
  3: [
    { label: "Push", groups: ["Pectoraux", "Épaules", "Triceps"] },
    { label: "Pull", groups: ["Dos", "Biceps", "Trapèzes"] },
    { label: "Legs", groups: ["Quadriceps", "Ischio-jambiers", "Fessiers", "Mollets"] },
  ],
  4: [
    { label: "Haut du corps A", groups: ["Pectoraux", "Dos", "Épaules"] },
    { label: "Bas du corps A", groups: ["Quadriceps", "Ischio-jambiers", "Fessiers"] },
    { label: "Haut du corps B", groups: ["Dos", "Pectoraux", "Biceps", "Triceps"] },
    { label: "Bas du corps B", groups: ["Fessiers", "Ischio-jambiers", "Mollets"] },
  ],
  5: [
    { label: "Push", groups: ["Pectoraux", "Épaules", "Triceps"] },
    { label: "Pull", groups: ["Dos", "Biceps", "Trapèzes"] },
    { label: "Legs", groups: ["Quadriceps", "Ischio-jambiers", "Fessiers", "Mollets"] },
    { label: "Haut du corps", groups: ["Pectoraux", "Dos", "Épaules"] },
    { label: "Bas du corps", groups: ["Quadriceps", "Fessiers", "Mollets"] },
  ],
  6: [
    { label: "Push A", groups: ["Pectoraux", "Épaules", "Triceps"] },
    { label: "Pull A", groups: ["Dos", "Biceps", "Trapèzes"] },
    { label: "Legs A", groups: ["Quadriceps", "Ischio-jambiers", "Fessiers"] },
    { label: "Push B", groups: ["Pectoraux", "Épaules", "Triceps"] },
    { label: "Pull B", groups: ["Dos", "Biceps"] },
    { label: "Legs B", groups: ["Quadriceps", "Ischio-jambiers", "Mollets"] },
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

// ── Vérification de compatibilité exercice / client ─────────────────────────
// Utilisé dans le constructeur de programme : avant d'ajouter un exercice,
// on croise son nom/matériel avec les contraintes déclarées dans la fiche
// client (blessures, exercices problématiques, matériel détesté) + toute
// contrainte que le coach ajoute lui-même sur le moment si la fiche est
// incomplète. Pas un blocage silencieux (comme dans le générateur de
// suggestions) : ici le coach voit exactement pourquoi et décide.

export type ConflictSource = "injuries" | "exercises_problematic" | "disliked_equipment" | "custom";

export interface ExerciseConflict {
  source: ConflictSource;
  keyword: string;
}

const CONFLICT_SOURCE_LABEL: Record<ConflictSource, string> = {
  injuries: "Blessure/douleur déclarée",
  exercises_problematic: "Exercice signalé comme problématique",
  disliked_equipment: "Matériel détesté déclaré",
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
  intake: Pick<ClientIntake, "injuries" | "exercises_problematic" | "disliked_equipment"> | null,
  customConstraints: string
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
  return conflicts;
}

// Débutant < intermédiaire < avancé — un exercice "avancé" (drag curl, sissy
// squat, JM press...) ne devrait jamais être le premier choix suggéré sans
// savoir si le client a le niveau technique requis. Le générateur n'a pas
// accès au niveau réel du client (pas de champ dans la fiche), donc on
// privilégie par défaut les mouvements les plus simples/robustes plutôt que
// de tirer au hasard (ancien tri : alphabétique).
const DIFFICULTY_RANK: Record<string, number> = { debutant: 0, intermediaire: 1, avance: 2 };

function difficultyRank(ex: LibraryExercise): number {
  return DIFFICULTY_RANK[ex.difficulty ?? "intermediaire"] ?? 1;
}

export interface ExerciseSuggestion {
  name: string;
  category: "compose" | "isolation" | null;
  difficulty: string | null;
  equipment: string | null;
  muscleSubgroup: string | null;
  reason: string;
}

function toSuggestion(ex: LibraryExercise): ExerciseSuggestion {
  const diffLabel =
    ex.difficulty === "debutant" ? "débutant" : ex.difficulty === "avance" ? "avancé, vérifie la maîtrise technique" : "intermédiaire";
  return {
    name: ex.name,
    category: ex.category,
    difficulty: ex.difficulty,
    equipment: ex.equipment,
    muscleSubgroup: ex.muscle_subgroup,
    reason: `${ex.category === "compose" ? "Mouvement composé" : "Isolation"}, niveau ${diffLabel}${ex.muscle_subgroup ? ` (cible ${ex.muscle_subgroup})` : ""}.`,
  };
}

export interface MuscleGroupSuggestion {
  group: string;
  compound: ExerciseSuggestion[];
  isolation: ExerciseSuggestion[];
}

// Renvoie plusieurs candidats par catégorie (pas un choix figé) — le but est
// de suggérer des options que le coach compare et choisit lui-même, jamais
// de décider à sa place.
function suggestForGroup(
  library: LibraryExercise[],
  group: string,
  excludeText: string,
  maxPerCategory = 3
): MuscleGroupSuggestion {
  const candidates = library.filter((ex) => ex.muscle_group === group && !isExcluded(ex, excludeText));
  const byQuality = (a: LibraryExercise, b: LibraryExercise) =>
    difficultyRank(a) - difficultyRank(b) || a.name.localeCompare(b.name, "fr");

  const compound = candidates.filter((ex) => ex.category === "compose").sort(byQuality).slice(0, maxPerCategory);
  const isolation = candidates.filter((ex) => ex.category === "isolation").sort(byQuality).slice(0, maxPerCategory);

  return { group, compound: compound.map(toSuggestion), isolation: isolation.map(toSuggestion) };
}

export interface ProgramSuggestion {
  dayLabel: string;
  groups: MuscleGroupSuggestion[];
}

// Suggestions pures, jamais un programme prêt à sauvegarder — pas de sets/reps
// prescrits, pas d'ExerciseInput/DayInput : le coach construit le programme
// lui-même (via le picker normal) et pioche dans ces pistes s'il veut.
export function buildProgramSuggestions(
  sessionsPerWeek: number,
  library: LibraryExercise[],
  dislikedEquipment: string | null,
  exercisesProblematic: string | null
): ProgramSuggestion[] {
  const template = SPLIT_TEMPLATES[clampSessions(sessionsPerWeek)];
  const excludeText = `${dislikedEquipment ?? ""} ${exercisesProblematic ?? ""}`;

  return template.map((day) => ({
    dayLabel: day.label,
    groups: day.groups.map((group) => suggestForGroup(library, group, excludeText)),
  }));
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
  deficit: "Déficit / Sèche",
  surplus: "Prise de masse",
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
