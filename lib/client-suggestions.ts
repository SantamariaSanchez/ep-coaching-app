import type { ClientIntake } from "@/utils/client-intake";
import type { NutritionProfile } from "@/utils/nutrition";
import type { DailyLog } from "@/utils/daily-logs";
import type { ProgramWithDays } from "@/utils/programs";

// Onglet de ClientProfileTabs le plus concerné par la suggestion — permet
// d'afficher un petit indicateur directement sur l'onglet (voir badge dans
// ClientProfileTabs) plutôt que de forcer le coach à ouvrir "Profil" pour
// découvrir qu'il y a quelque chose à regarder ailleurs. Les suggestions
// sans lien clair avec un onglet précis (ex. objectifs manquants) restent
// sans tab — elles ne vivent que dans le panneau de "Profil".
export type SuggestionTab = "nutrition" | "programme" | "bilans" | "cycle";

export interface ClientSuggestion {
  id: string;
  severity: "info" | "warning";
  text: string;
  tab?: SuggestionTab;
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
      text: `Stress élevé déclaré (${intake.stress_level}/10), envisage d'alléger le volume ou l'intensité cette semaine plutôt que de pousser plus fort.`,
      tab: "programme",
    });
  }

  if (
    (intake.sleep_quality != null && intake.sleep_quality <= 3) ||
    (intake.sleep_hours != null && intake.sleep_hours < 6)
  ) {
    s.push({
      id: "sleep",
      severity: "warning",
      text: "Sommeil faible ou de mauvaise qualité déclaré, la récupération est probablement le facteur limitant avant toute progression de charge.",
      tab: "bilans",
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
      text: "Zéro écart déclaré alors que l'objectif est une sèche, envisage un repas ou une journée de refeed planifiée pour limiter le risque de craquage incontrôlé.",
      tab: "nutrition",
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
      text: `Écart important entre ce que le client dit manger actuellement (${intake.known_calories} kcal) et l'objectif fixé (${nutritionProfile.calories_target} kcal), vaut le coup d'en discuter avant d'ajuster le plan.`,
      tab: "nutrition",
    });
  }

  // ── Glucides / lipides déclarés vs cibles — même logique que les kcal et
  // les protéines, mais sur les deux autres macros souvent oubliées ──
  if (nutritionProfile) {
    const macroChecks: Array<[number | null, number | null | undefined, string]> = [
      [intake.known_carbs, nutritionProfile.carbs_target, "glucides"],
      [intake.known_fat, nutritionProfile.fats_target, "lipides"],
    ];
    for (const [known, target, label] of macroChecks) {
      if (known != null && target != null && Math.abs(known - target) > target * 0.4) {
        s.push({
          id: `macro-mismatch-${label}`,
          severity: "info",
          text: `${label === "glucides" ? "Glucides" : "Lipides"} déclarés (${known}g) très éloignés de la cible du plan (${target}g), vérifie que le plan correspond vraiment à ce que le client mange déjà.`,
          tab: "nutrition",
        });
      }
    }
  }

  if (
    intake.meals_current != null &&
    intake.meals_ideal != null &&
    intake.meals_current < intake.meals_ideal
  ) {
    s.push({
      id: "meal-frequency",
      severity: "info",
      text: `Le client fait ${intake.meals_current} repas/jour mais en voudrait idéalement ${intake.meals_ideal}, vaut le coup de l'aider à structurer ça plutôt que de rester sur l'existant par défaut.`,
      tab: "nutrition",
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
      text: `Objectif de perte de poids mais seulement ~${intake.avg_daily_steps} pas/jour déclarés, augmenter le NEAT (pas quotidiens) est souvent le levier le plus simple avant de couper encore les calories.`,
      tab: "bilans",
    });
  }

  // ── Appareil connecté déclaré mais aucun pas moyen renseigné — signe
  // probable qu'il n'est jamais synchronisé/vérifié côté coach ──
  if (intake.wearable_device && intake.avg_daily_steps == null) {
    s.push({
      id: "wearable-unused",
      severity: "info",
      text: `Appareil connecté déclaré ("${intake.wearable_device}") mais aucune moyenne de pas renseignée, vaut le coup de vérifier que les données remontent bien plutôt que de compter sur du déclaratif.`,
      tab: "bilans",
    });
  }

  if (intake.injuries) {
    s.push({
      id: "injuries",
      severity: "warning",
      text: `Blessures/douleurs déclarées : "${intake.injuries}", vérifie que le programme actuel les contourne.`,
      tab: "programme",
    });
  }

  // ── Problèmes de santé généraux — distinct des blessures ponctuelles,
  // souvent plus structurant (conditions chroniques, contre-indications) ──
  if (intake.health_issues) {
    s.push({
      id: "health-issues",
      severity: "warning",
      text: `Problèmes de santé déclarés : "${intake.health_issues}", à garder en tête pour le programme et le plan nutritionnel, pas juste pour l'entraînement.`,
      tab: "programme",
    });
  }

  // ── Âge — pas de jugement, juste un rappel de calibrage utile pour la
  // progression de charge et la fréquence de récupération ──
  if (intake.date_of_birth) {
    const ageMs = Date.now() - new Date(intake.date_of_birth).getTime();
    const age = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
    if (age >= 55) {
      s.push({
        id: "age-recovery",
        severity: "info",
        text: `${age} ans, progression de charge probablement plus lente à envisager, avec une récupération entre séances à surveiller de près.`,
        tab: "programme",
      });
    } else if (age > 0 && age < 16) {
      s.push({
        id: "age-young",
        severity: "warning",
        text: `${age} ans déclarés, vérifie l'encadrement adapté (charges, technique, supervision) pour un public aussi jeune.`,
        tab: "programme",
      });
    }
  }

  // ── Cardio explicitement détesté/absent alors que l'objectif est une
  // perte de poids — le programme doit compter sur autre chose (NEAT, déficit
  // calorique) plutôt que de forcer du cardio qui ne sera pas suivi ──
  if (
    intake.cardio_preference &&
    /aucun|d[ée]teste|pas de cardio|n'aime pas|horreur/i.test(intake.cardio_preference) &&
    intake.goal_3_months &&
    /sec|sèch|deficit|défic|maigr|perte/i.test(intake.goal_3_months)
  ) {
    s.push({
      id: "cardio-aversion",
      severity: "info",
      text: `Cardio explicitement pas apprécié ("${intake.cardio_preference}") alors que l'objectif est une perte de poids, mise sur le NEAT et le déficit alimentaire plutôt que sur du cardio imposé qui a peu de chances d'être tenu.`,
      tab: "programme",
    });
  }

  // ── Exercices qui fonctionnent bien pour ce client — toujours affiché
  // s'il est renseigné, pour ne pas les perdre de vue lors d'une refonte de
  // programme (contrairement aux exercices problématiques, rien ne les
  // vérifie automatiquement contre le programme assigné) ──
  if (intake.exercises_that_work) {
    s.push({
      id: "exercises-that-work",
      severity: "info",
      text: `Exercices qui fonctionnent bien pour ce client : "${intake.exercises_that_work}", à garder ou réintégrer si une refonte de programme est en cours.`,
      tab: "programme",
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
      text: `Le client fait ${intake.sessions_current} séances/semaine mais en voudrait ${intake.sessions_desired}, monter progressivement plutôt que de programmer directement la cible évite l'échec par surcharge.`,
      tab: "programme",
    });
  }

  if (intake.gender === "Femme" && periodLogsCount === 0) {
    s.push({
      id: "cycle-tracking",
      severity: "info",
      text: "Cliente sans aucun cycle encore loggé, pense à activer le suivi (onglet Cycle), utile pour interpréter les fluctuations de poids et d'énergie.",
      tab: "cycle",
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
        text: `Objectif de prise de masse mais le poids a baissé de ${Math.abs(deltaKg).toFixed(1)}kg sur les pesées récentes, les calories sont probablement trop basses par rapport à l'objectif affiché.`,
        tab: "nutrition",
      });
    } else if (wantsLoss && deltaKg > 0.5) {
      s.push({
        id: "weight-trend-mismatch-loss",
        severity: "warning",
        text: `Objectif de perte mais le poids a augmenté de ${deltaKg.toFixed(1)}kg sur les pesées récentes, vaut le coup de vérifier l'adhésion au plan ou la fenêtre calorique.`,
        tab: "nutrition",
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
      text: "Aucun objectif (3 mois / 12 mois) renseigné dans la fiche, difficile de justifier les choix de programme/nutrition sans ça.",
    });
  }

  // ── Préférences contradictoires ──
  if (intake.plan_preference === "fixe" && intake.calorie_preference === "variable") {
    s.push({
      id: "plan-calorie-conflict",
      severity: "info",
      text: "Le client veut un plan fixe mais un apport calorique qui varie selon les jours, vaut le coup de clarifier ce qu'il attend concrètement avant de construire le plan.",
      tab: "nutrition",
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
      text: `Régime ${intake.diet_type === "vegan" ? "vegan" : "végétarien"} avec ${intake.known_protein}g de protéines déclarées contre ${nutritionProfile.proteins_target}g visés, sources protéiques végétales à identifier avec le client (les options sont plus limitées qu'en omnivore).`,
      tab: "nutrition",
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
      text: "Métier plutôt sédentaire et peu de pas déclarés, des rappels de marche répartis dans la journée (plutôt qu'un bloc unique) seront probablement plus faciles à tenir pour ce profil.",
      tab: "bilans",
    });
  }

  // ── Budget compléments nul mais cheat meals fréquents / impact négatif déclaré ──
  if (intake.supplement_budget === 0 && intake.cheat_meal_impact) {
    s.push({
      id: "no-supplement-budget",
      severity: "info",
      text: `Aucun budget compléments déclaré, les leviers pour ce client passent uniquement par l'alimentation et le mode de vie (ex. impact des écarts déclaré : "${intake.cheat_meal_impact}").`,
      tab: "nutrition",
    });
  }

  // ── Restrictions alimentaires en texte libre non reflétées ailleurs ──
  if (intake.dietary_restrictions && !intake.diet_type) {
    s.push({
      id: "restrictions-no-diet-type",
      severity: "warning",
      text: `Restrictions alimentaires déclarées ("${intake.dietary_restrictions}") mais aucun type de régime sélectionné, vérifie que le créateur de recette/plan en tient bien compte.`,
      tab: "nutrition",
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
          text: `Le programme assigné contient "${match}" alors que le client a signalé "${term}" comme problématique ou détesté, vaut le coup de vérifier/remplacer.`,
          tab: "programme",
        });
      }
    }
  }

  // ── Séances désirées vs jours réellement programmés ──
  if (program && intake.sessions_desired != null && program.days.length > 0 && program.days.length < intake.sessions_desired) {
    s.push({
      id: "program-days-gap",
      severity: "info",
      text: `Le client veut ${intake.sessions_desired} séances/semaine mais le programme assigné n'a que ${program.days.length} jour${program.days.length > 1 ? "s" : ""}, écart à combler ou à clarifier avec lui.`,
      tab: "programme",
    });
  }

  // ── Style de séance préféré jamais confronté au programme assigné —
  // signalé une fois pour rappel, pas de matching automatique fiable (texte
  // libre trop varié pour comparer proprement aux jours du programme) ──
  if (program && intake.preferred_split && program.days.length > 0) {
    s.push({
      id: "preferred-split-reminder",
      severity: "info",
      text: `Split préféré déclaré : "${intake.preferred_split}", vérifie que le programme assigné s'en approche.`,
      tab: "programme",
    });
  }

  // ── Salle renseignée mais jamais reliée à l'annuaire ──
  if (intake.gym_name && !intake.gym_link) {
    s.push({
      id: "gym-no-link",
      severity: "info",
      text: `Salle "${intake.gym_name}" renseignée sans lien, si elle existe dans l'annuaire des salles, ça vaut le coup de la relier pour que le client la retrouve facilement.`,
    });
  }

  return s;
}
