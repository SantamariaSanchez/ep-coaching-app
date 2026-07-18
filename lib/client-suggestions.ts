import type { ClientIntake } from "@/utils/client-intake";
import type { NutritionProfile } from "@/utils/nutrition";
import type { DailyLog } from "@/utils/daily-logs";

export interface ClientSuggestion {
  id: string;
  severity: "info" | "warning";
  text: string;
}

// Suggestions concrètes générées à partir de la fiche client (+ objectifs
// nutrition + bilan quotidien récent) — pas une IA, un jeu de règles simples
// et explicables, chacune reliée à un champ précis rempli par le coach.
// Le but : que la fiche client serve vraiment à quelque chose plutôt que
// d'être juste un formulaire rempli une fois et jamais réutilisé.
export function generateClientSuggestions(
  intake: ClientIntake | null,
  nutritionProfile: NutritionProfile | null,
  recentDailyLogs: DailyLog[],
  periodLogsCount = 0
): ClientSuggestion[] {
  if (!intake) return [];
  const s: ClientSuggestion[] = [];

  if (intake.stress_level != null && intake.stress_level >= 8) {
    s.push({
      id: "stress",
      severity: "warning",
      text: `Stress élevé déclaré (${intake.stress_level}/10) — envisage d'alléger le volume ou l'intensité cette semaine plutôt que de pousser plus fort.`,
    });
  }

  if (
    (intake.sleep_quality != null && intake.sleep_quality <= 3) ||
    (intake.sleep_hours != null && intake.sleep_hours < 6)
  ) {
    s.push({
      id: "sleep",
      severity: "warning",
      text: "Sommeil faible ou de mauvaise qualité déclaré — la récupération est probablement le facteur limitant avant toute progression de charge.",
    });
  }

  if (
    intake.cheat_meals_per_week === 0 &&
    intake.goal_3_months &&
    /sec|sèch|deficit|défic|maigr/i.test(intake.goal_3_months)
  ) {
    s.push({
      id: "no-refeed",
      severity: "info",
      text: "Zéro écart déclaré alors que l'objectif est une sèche — envisage un repas ou une journée de refeed planifiée pour limiter le risque de craquage incontrôlé.",
    });
  }

  if (
    intake.known_calories != null &&
    nutritionProfile?.calories_target != null &&
    Math.abs(intake.known_calories - nutritionProfile.calories_target) > 500
  ) {
    s.push({
      id: "calorie-mismatch",
      severity: "warning",
      text: `Écart important entre ce que le client dit manger actuellement (${intake.known_calories} kcal) et l'objectif fixé (${nutritionProfile.calories_target} kcal) — vaut le coup d'en discuter avant d'ajuster le plan.`,
    });
  }

  if (
    intake.meals_current != null &&
    intake.meals_ideal != null &&
    intake.meals_current < intake.meals_ideal
  ) {
    s.push({
      id: "meal-frequency",
      severity: "info",
      text: `Le client fait ${intake.meals_current} repas/jour mais en voudrait idéalement ${intake.meals_ideal} — vaut le coup de l'aider à structurer ça plutôt que de rester sur l'existant par défaut.`,
    });
  }

  if (
    intake.avg_daily_steps != null &&
    intake.avg_daily_steps < 4000 &&
    intake.goal_3_months &&
    /sec|sèch|deficit|défic|maigr|perte/i.test(intake.goal_3_months)
  ) {
    s.push({
      id: "low-steps",
      severity: "info",
      text: `Objectif de perte de poids mais seulement ~${intake.avg_daily_steps} pas/jour déclarés — augmenter le NEAT (pas quotidiens) est souvent le levier le plus simple avant de couper encore les calories.`,
    });
  }

  if (intake.injuries) {
    s.push({
      id: "injuries",
      severity: "warning",
      text: `Blessures/douleurs déclarées : "${intake.injuries}" — vérifie que le programme actuel les contourne.`,
    });
  }

  if (
    intake.sessions_current != null &&
    intake.sessions_desired != null &&
    intake.sessions_current < intake.sessions_desired
  ) {
    s.push({
      id: "session-gap",
      severity: "info",
      text: `Le client fait ${intake.sessions_current} séances/semaine mais en voudrait ${intake.sessions_desired} — monter progressivement plutôt que de programmer directement la cible évite l'échec par surcharge.`,
    });
  }

  if (intake.gender === "Femme" && periodLogsCount === 0) {
    s.push({
      id: "cycle-tracking",
      severity: "info",
      text: "Cliente sans aucun cycle encore loggé — pense à activer le suivi (onglet Cycle), utile pour interpréter les fluctuations de poids et d'énergie.",
    });
  }

  const weighIns = recentDailyLogs
    .filter((l) => l.weight_morning != null)
    .sort((a, b) => a.log_date.localeCompare(b.log_date));
  if (weighIns.length >= 5 && intake.goal_3_months) {
    const first = weighIns[0].weight_morning!;
    const last = weighIns[weighIns.length - 1].weight_morning!;
    const deltaKg = last - first;
    const wantsGain = /massif|prise|surplus|gain/i.test(intake.goal_3_months);
    const wantsLoss = /sec|sèch|deficit|défic|maigr|perte/i.test(intake.goal_3_months);
    if (wantsGain && deltaKg < 0) {
      s.push({
        id: "weight-trend-mismatch-gain",
        severity: "warning",
        text: `Objectif de prise de masse mais le poids a baissé de ${Math.abs(deltaKg).toFixed(1)}kg sur les pesées récentes — les calories sont probablement trop basses par rapport à l'objectif affiché.`,
      });
    } else if (wantsLoss && deltaKg > 0.5) {
      s.push({
        id: "weight-trend-mismatch-loss",
        severity: "warning",
        text: `Objectif de perte mais le poids a augmenté de ${deltaKg.toFixed(1)}kg sur les pesées récentes — vaut le coup de vérifier l'adhésion au plan ou la fenêtre calorique.`,
      });
    }
  }

  return s;
}
