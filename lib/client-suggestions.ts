import type { ClientIntake } from "@/utils/client-intake";
import type { NutritionProfile } from "@/utils/nutrition";
import type { DailyLog } from "@/utils/daily-logs";
import type { ProgramWithDays } from "@/utils/programs";

export interface ClientSuggestion {
  id: string;
  severity: "info" | "warning";
  text: string;
}

// Découpe un texte libre ("squat, développé couché et fentes") en termes
// comparables — utilisé pour croiser les mentions libres du client
// (exercices problématiques, matériel détesté) avec le programme assigné.
function splitFreeText(text: string): string[] {
  return text
    .split(/[,;\n]|(?:\bet\b)|(?:\bou\b)/i)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 3);
}

// Suggestions concrètes générées à partir de la fiche client (+ objectifs
// nutrition + bilan quotidien récent + programme assigné) — pas une IA, un
// jeu de règles simples et explicables, chacune reliée à un champ précis
// rempli par le coach. Le but : que la fiche client serve vraiment à
// quelque chose plutôt que d'être juste un formulaire rempli une fois et
// jamais réutilisé.
export function generateClientSuggestions(
  intake: ClientIntake | null,
  nutritionProfile: NutritionProfile | null,
  recentDailyLogs: DailyLog[],
  periodLogsCount = 0,
  program: ProgramWithDays | null = null
): ClientSuggestion[] {
  if (!intake) return [];
  const s: ClientSuggestion[] = [];

  // ── Demande directe du client — toujours visible, pas conditionnelle ──
  if (intake.how_coach_can_help) {
    s.push({
      id: "help-request",
      severity: "info",
      text: `Demande directe du client sur comment l'aider : "${intake.how_coach_can_help}"`,
    });
  }

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

  // ── Notes libres — toujours visible si remplies, facile à oublier ──
  if (intake.additional_notes) {
    s.push({
      id: "additional-notes",
      severity: "info",
      text: `Note libre du client : "${intake.additional_notes}"`,
    });
  }

  // ── Fiche incomplète sur les objectifs — difficile de calibrer sans ça ──
  if (!intake.goal_3_months && !intake.goal_12_months) {
    s.push({
      id: "no-goals",
      severity: "warning",
      text: "Aucun objectif (3 mois / 12 mois) renseigné dans la fiche — difficile de justifier les choix de programme/nutrition sans ça.",
    });
  }

  // ── Préférences contradictoires ──
  if (intake.plan_preference === "fixe" && intake.calorie_preference === "variable") {
    s.push({
      id: "plan-calorie-conflict",
      severity: "info",
      text: "Le client veut un plan fixe mais un apport calorique qui varie selon les jours — vaut le coup de clarifier ce qu'il attend concrètement avant de construire le plan.",
    });
  }

  // ── Protéines potentiellement insuffisantes en régime végétal ──
  if (
    (intake.diet_type === "vegan" || intake.diet_type === "vegetarien") &&
    intake.known_protein != null &&
    nutritionProfile?.proteins_target != null &&
    intake.known_protein < nutritionProfile.proteins_target * 0.7
  ) {
    s.push({
      id: "plant-protein-gap",
      severity: "warning",
      text: `Régime ${intake.diet_type === "vegan" ? "vegan" : "végétarien"} avec ${intake.known_protein}g de protéines déclarées contre ${nutritionProfile.proteins_target}g visés — sources protéiques végétales à identifier avec le client (les options sont plus limitées qu'en omnivore).`,
    });
  }

  // ── Sédentarité professionnelle ──
  if (
    intake.avg_daily_steps != null &&
    intake.avg_daily_steps < 5000 &&
    intake.work_hours &&
    /bureau|assis|sédent|ordinateur|télétravail|remote/i.test(intake.work_hours + " " + (intake.occupation ?? ""))
  ) {
    s.push({
      id: "sedentary-job",
      severity: "info",
      text: "Métier plutôt sédentaire et peu de pas déclarés — des rappels de marche répartis dans la journée (plutôt qu'un bloc unique) seront probablement plus faciles à tenir pour ce profil.",
    });
  }

  // ── Budget compléments nul mais cheat meals fréquents / impact négatif déclaré ──
  if (intake.supplement_budget === 0 && intake.cheat_meal_impact) {
    s.push({
      id: "no-supplement-budget",
      severity: "info",
      text: `Aucun budget compléments déclaré — les leviers pour ce client passent uniquement par l'alimentation et le mode de vie (ex. impact des écarts déclaré : "${intake.cheat_meal_impact}").`,
    });
  }

  // ── Restrictions alimentaires en texte libre non reflétées ailleurs ──
  if (intake.dietary_restrictions && !intake.diet_type) {
    s.push({
      id: "restrictions-no-diet-type",
      severity: "warning",
      text: `Restrictions alimentaires déclarées ("${intake.dietary_restrictions}") mais aucun type de régime sélectionné — vérifie que le créateur de recette/plan en tient bien compte.`,
    });
  }

  // ── Exercices problématiques / matériel détesté présents dans le programme assigné ──
  if (program) {
    const assignedNames = program.days
      .flatMap((d) => d.exercises)
      .map((e) => e.name.toLowerCase());

    const problematicTerms = intake.exercises_problematic ? splitFreeText(intake.exercises_problematic) : [];
    const dislikedTerms = intake.disliked_equipment ? splitFreeText(intake.disliked_equipment) : [];

    for (const term of [...problematicTerms, ...dislikedTerms]) {
      const match = assignedNames.find((n) => n.includes(term) || term.includes(n));
      if (match) {
        s.push({
          id: `program-conflict-${term}`,
          severity: "warning",
          text: `Le programme assigné contient "${match}" alors que le client a signalé "${term}" comme problématique ou détesté — vaut le coup de vérifier/remplacer.`,
        });
      }
    }
  }

  // ── Séances désirées vs jours réellement programmés ──
  if (program && intake.sessions_desired != null && program.days.length > 0 && program.days.length < intake.sessions_desired) {
    s.push({
      id: "program-days-gap",
      severity: "info",
      text: `Le client veut ${intake.sessions_desired} séances/semaine mais le programme assigné n'a que ${program.days.length} jour${program.days.length > 1 ? "s" : ""} — écart à combler ou à clarifier avec lui.`,
    });
  }

  // ── Salle renseignée mais jamais reliée à l'annuaire ──
  if (intake.gym_name && !intake.gym_link) {
    s.push({
      id: "gym-no-link",
      severity: "info",
      text: `Salle "${intake.gym_name}" renseignée sans lien — si elle existe dans l'annuaire des salles, ça vaut le coup de la relier pour que le client la retrouve facilement.`,
    });
  }

  return s;
}
