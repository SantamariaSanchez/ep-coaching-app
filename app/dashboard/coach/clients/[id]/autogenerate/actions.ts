"use server";
import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { getClientIntake } from "@/utils/client-intake";
import { getLatestWeight } from "@/utils/daily-logs";
import { getExerciseLibrary } from "@/utils/exercise-library";
import {
  inferPhase,
  ageFromDateOfBirth,
  parseSessionDuration,
  computeNutritionTargets,
  buildProgramSuggestions,
  buildRoadmapPayload,
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
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error, ...empty };

  const intake = await getClientIntake(clientId);
  if (!intake) {
    return { error: "Remplis d'abord la fiche client avant de générer des suggestions.", ...empty };
  }

  const warnings: string[] = [];
  const admin = createAdminClient();

  const [latestWeight, profileRes] = await Promise.all([
    getLatestWeight(clientId),
    admin.from("profiles").select("weight_start").eq("id", clientId).single(),
  ]);
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
    });
    nutrition = { ...targets, phase };
  } else {
    warnings.push(
      "Nutrition : il manque le poids (aucune pesée trouvée), la taille ou la date de naissance dans la fiche client."
    );
  }

  // ── Programme (suggestions, pas un programme prêt à sauvegarder) ────────
  const library = await getExerciseLibrary();
  let program: ProgramSuggestion[] | null = null;
  if (library.length === 0) {
    warnings.push("Programme : bibliothèque d'exercices vide.");
  } else {
    program = buildProgramSuggestions(sessionsPerWeek, library, intake.disliked_equipment, intake.exercises_problematic);
  }

  // ── Road map ───────────────────────────────────────────────────────────
  const roadmap = buildRoadmapPayload(intake, phase);

  return { warnings, nutrition, program, roadmap };
}
