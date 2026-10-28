"use server";
import { requireOwnClient } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { getClientIntake } from "@/utils/client-intake";
import { getLatestWeight } from "@/utils/daily-logs";
import { getMemberPreferences } from "@/utils/member-preferences";
import { getEatingRelation } from "@/lib/eating-safety-server";
import { getTrainingGyms } from "@/utils/training-gyms";
import { equipmentFilterFor } from "@/lib/gym-equipment";
import { buildDietFramework, type DietFramework } from "@/lib/diet-models";
import { NUTRITION_RULES } from "@/lib/coaching-knowledge";
import { getExerciseLibrary } from "@/utils/exercise-library";
import {
  inferPhase,
  ageFromDateOfBirth,
  parseSessionDuration,
  computeNutritionTargets,
  buildProgramSuggestions,
  buildRoadmapPayload,
  levelFromExperience,
  type InferredPhase,
  type ProgramSuggestion,
  type RoadmapPayload,
} from "@/lib/plan-generator";

export interface NutritionSuggestion {
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  tdee: number;
  bmr: number;
  phase: InferredPhase;
  /** Fibres conseillées, en g par jour. */
  fiber: number;
  /** Cadre de répartition des repas ; null si la relation à l'alimentation interdit tout chiffre. */
  dietFramework: DietFramework | null;
}

export interface PlanSuggestions {
  error?: string;
  warnings: string[];
  nutrition: NutritionSuggestion | null;
  program: ProgramSuggestion[] | null;
  roadmap: RoadmapPayload | null;
}

// Suggestions PURES à partir de la fiche client déjà remplie — objectifs
// nutrition (même formule que le calculateur manuel), plusieurs candidats
// d'exercices par groupe musculaire (pas un choix figé), et une proposition
// de road map. Rien de tout ça n'est écrit en base : le coach lit, compare,
// et reporte lui-même ce qu'il veut garder dans les outils habituels
// (Objectifs TDEE, éditeur de programme, éditeur de road map). Le coach a
// explicitement demandé de ne plus jamais laisser un outil décider/sauver
// un plan à sa place.
export async function generatePlanSuggestions(clientId: string): Promise<PlanSuggestions> {
  const empty = { warnings: [], nutrition: null, program: null, roadmap: null };
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error, ...empty };

  const intake = await getClientIntake(clientId);
  if (!intake) {
    return { error: "Remplis d'abord la fiche client avant de générer des suggestions.", ...empty };
  }

  const warnings: string[] = [];
  const admin = createAdminClient();

  const [latestWeight, profileRes, preferences, eatingRelation] = await Promise.all([
    getLatestWeight(clientId),
    admin.from("profiles").select("weight_start").eq("id", clientId).single(),
    getMemberPreferences(clientId),
    getEatingRelation(clientId),
  ]);
  const level = levelFromExperience(preferences?.experience_level);
  const weightKg = latestWeight ?? (profileRes.data as { weight_start: number | null } | null)?.weight_start ?? null;

  const phase = inferPhase(intake);
  const sessionsPerWeek = intake.sessions_desired ?? intake.sessions_current ?? 4;

  // ── Nutrition ──────────────────────────────────────────────────────────
  let nutrition: NutritionSuggestion | null = null;
  if (weightKg && intake.height_cm && intake.date_of_birth) {
    const age = ageFromDateOfBirth(intake.date_of_birth);
    const targets = computeNutritionTargets({
      gender: intake.gender,
      weightKg,
      heightCm: intake.height_cm,
      age,
      sessionsPerWeek,
      sessionDurationMin: parseSessionDuration(intake.session_duration),
      stepsPerDay: intake.avg_daily_steps ?? 6000,
      phase,
      level,
      eatingRelation,
    });
    nutrition = {
      ...targets,
      phase: targets.phaseApplied,
      fiber: Math.round((targets.calories / 1000) * NUTRITION_RULES.fiberGPer1000Kcal),
      dietFramework: buildDietFramework({
        targets: { calories: targets.calories, proteins: targets.proteins, carbs: targets.carbs, fats: targets.fats },
        weightKg,
        mealsPerDay: intake.meals_ideal,
        dietType: intake.diet_type,
        practical: intake.schedule_type === "variable",
        planPreference: intake.plan_preference,
        eatingRelation,
      }),
    };
    if (targets.note) warnings.push(`Nutrition : ${targets.note}`);
  } else {
    warnings.push(
      "Nutrition : il manque le poids (aucune pesée trouvée), la taille ou la date de naissance dans la fiche client."
    );
  }

  // ── Programme (suggestions, pas un programme prêt à sauvegarder) ────────
  const library = await getExerciseLibrary();
  // Le programme dépend du matériel de la salle du client, jamais de la diète.
  const clientGyms = await getTrainingGyms(clientId);
  const gymEquipment = equipmentFilterFor(clientGyms[0]);
  let program: ProgramSuggestion[] | null = null;
  if (library.length === 0) {
    warnings.push("Programme : bibliothèque d'exercices vide.");
  } else {
    program = buildProgramSuggestions(
      sessionsPerWeek,
      library,
      intake.disliked_equipment,
      intake.exercises_problematic,
      intake.training_access,
      intake.injuries,
      level,
      gymEquipment
    );
    if (!intake.training_access) {
      warnings.push(
        "Programme : lieu d'entraînement non renseigné dans la fiche client, les suggestions incluent aussi bien du matériel de salle que des exercices maison, vérifie avant de les proposer."
      );
    }
  }

  // ── Road map ───────────────────────────────────────────────────────────
  const roadmap = buildRoadmapPayload(intake, phase);

  return { warnings, nutrition, program, roadmap };
}
