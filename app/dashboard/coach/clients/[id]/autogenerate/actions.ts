"use server";
import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { getClientIntake } from "@/utils/client-intake";
import { getLatestWeight } from "@/utils/daily-logs";
import { getExerciseLibrary } from "@/utils/exercise-library";
import { saveNutritionProfile } from "../nutrition/actions";
import { createDietPlan } from "../nutrition/diet-plan-actions";
import { saveProgram } from "../program/actions";
import {
  inferPhase,
  ageFromDateOfBirth,
  parseSessionDuration,
  computeNutritionTargets,
  buildProgramDays,
  buildRoadmapPayload,
} from "@/lib/plan-generator";

export interface AutoGenerateResult {
  error?: string;
  warnings: string[];
  done: { nutrition: boolean; dietPlan: boolean; program: boolean; roadmap: boolean };
}

// Génère d'un coup, à partir de la fiche client déjà remplie : les objectifs
// nutrition (TDEE réel, même formule que le formulaire manuel), un plan
// alimentaire flexible de base, un programme d'entraînement complet (split
// adapté au nombre de séances voulu, exercices réels de la bibliothèque,
// équipement/exercices détestés exclus), et une road map avec la phase et
// les objectifs déclarés. Tout reste ensuite éditable normalement — c'est un
// point de départ construit à partir des vraies données du client, pas un
// remplacement du travail du coach.
export async function autoGenerateClientPlan(clientId: string): Promise<AutoGenerateResult> {
  const empty = { nutrition: false, dietPlan: false, program: false, roadmap: false };
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error, warnings: [], done: empty };

  const intake = await getClientIntake(clientId);
  if (!intake) {
    return { error: "Remplis d'abord la fiche client avant de générer le plan.", warnings: [], done: empty };
  }

  const warnings: string[] = [];
  const done = { ...empty };
  const admin = createAdminClient();

  const [latestWeight, profileRes] = await Promise.all([
    getLatestWeight(clientId),
    admin.from("profiles").select("weight_start").eq("id", clientId).single(),
  ]);
  const weightKg = latestWeight ?? (profileRes.data as { weight_start: number | null } | null)?.weight_start ?? null;

  const phase = inferPhase(intake);
  const sessionsPerWeek = intake.sessions_desired ?? intake.sessions_current ?? 4;

  // ── Nutrition ──────────────────────────────────────────────────────────
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

    const nutriRes = await saveNutritionProfile(clientId, {
      calories_target: targets.calories,
      proteins_target: targets.proteins,
      carbs_target: targets.carbs,
      fats_target: targets.fats,
      tdee: targets.tdee,
      bmr: targets.bmr,
      phase,
      gender: intake.gender === "Autre" || !intake.gender ? "Homme" : intake.gender,
      height: intake.height_cm,
      age,
      training_type: "Musculation",
      sessions_per_week: sessionsPerWeek,
      session_duration: parseSessionDuration(intake.session_duration),
      steps_per_day: intake.avg_daily_steps ?? 6000,
      activity_level: 0,
    });

    if (nutriRes.error) {
      warnings.push(`Nutrition : ${nutriRes.error}`);
    } else {
      done.nutrition = true;
      const planRes = await createDietPlan(clientId, "Plan flexible (généré)", "flexible", [], "daily");
      if (planRes.error) warnings.push(`Plan alimentaire : ${planRes.error}`);
      else done.dietPlan = true;
    }
  } else {
    warnings.push(
      "Nutrition non générée : il manque le poids (aucune pesée trouvée), la taille ou la date de naissance dans la fiche client."
    );
  }

  // ── Programme ──────────────────────────────────────────────────────────
  const library = await getExerciseLibrary();
  if (library.length === 0) {
    warnings.push("Programme non généré : bibliothèque d'exercices vide.");
  } else {
    const days = buildProgramDays(sessionsPerWeek, library, intake.disliked_equipment, intake.exercises_problematic);
    const progRes = await saveProgram(clientId, {
      name: "Programme généré",
      type: null,
      frequency: days.length,
      days,
    });
    if (progRes.error) warnings.push(`Programme : ${progRes.error}`);
    else done.program = true;
  }

  // ── Road map ───────────────────────────────────────────────────────────
  const roadmapPayload = buildRoadmapPayload(intake, phase);
  const { data: roadmap, error: rmErr } = await admin
    .from("roadmaps")
    .upsert(
      {
        client_id: clientId,
        created_by: guard.userId,
        start_date: roadmapPayload.start_date,
        end_date: roadmapPayload.end_date,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id" }
    )
    .select("id")
    .single();

  if (rmErr || !roadmap) {
    warnings.push(`Road map : ${rmErr?.message ?? "erreur inconnue"}`);
  } else {
    const roadmapId = (roadmap as { id: string }).id;
    await admin.from("roadmap_phases").delete().eq("roadmap_id", roadmapId);
    await admin.from("roadmap_phases").insert(
      roadmapPayload.phases.map((p, i) => ({ ...p, roadmap_id: roadmapId, position: i }))
    );
    await admin.from("roadmap_objectives").delete().eq("roadmap_id", roadmapId);
    if (roadmapPayload.objectives.length > 0) {
      await admin.from("roadmap_objectives").insert(
        roadmapPayload.objectives.map((o) => ({ ...o, roadmap_id: roadmapId }))
      );
    }
    done.roadmap = true;
  }

  revalidatePath(`/dashboard/coach/clients/${clientId}`);
  revalidatePath("/dashboard/client/program");
  revalidatePath("/dashboard/client/nutrition");
  revalidatePath("/dashboard/client/roadmap");

  return { warnings, done };
}
