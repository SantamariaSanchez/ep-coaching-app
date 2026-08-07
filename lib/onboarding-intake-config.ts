// Configuration du questionnaire d'onboarding complet — repris tel quel
// (mêmes questions, mêmes réponses, même ordre) de l'ancien formulaire
// externe ep-coaching-formulaires.vercel.app/onboarding, désormais intégré
// à l'appli : les réponses remplissent directement client_intake au lieu
// de partir par email avec des photos à joindre manuellement.

export type FieldType = "text" | "number" | "email" | "date" | "textarea" | "radio" | "scale";

export interface FieldDef {
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface SectionDef {
  key: string;
  title: string;
  kicker: string;
  conditional?: (answers: Record<string, string>) => boolean;
  groups: string[][];
  fields: Record<string, FieldDef>;
}

export const ONBOARDING_SECTIONS: SectionDef[] = [
  {
    key: "secA",
    title: "Informations générales",
    kicker: "Section 1",
    fields: {
      prenom: { type: "text", label: "Prénom", required: true },
      nom: { type: "text", label: "Nom", required: true },
      naissance: { type: "date", label: "Date de naissance", required: true },
      sexe: { type: "radio", label: "Sexe biologique", options: ["Homme", "Femme"], required: true },
      poids: { type: "number", label: "Poids actuel (kg)", required: true },
      taille: { type: "number", label: "Taille (cm)", required: true },
      metier: { type: "text", label: "Ton métier", required: true },
      horaires: { type: "text", label: "Tes horaires de travail type", required: true, placeholder: "Ex : 8h-18h du lundi au vendredi" },
      emploi_type: { type: "radio", label: "Ton emploi du temps est plutôt fixe ou variable d'une semaine à l'autre ?", options: ["Fixe", "Variable"], required: true },
    },
    groups: [["prenom", "nom"], ["naissance"], ["sexe"], ["poids", "taille"], ["metier", "horaires"], ["emploi_type"]],
  },
  {
    key: "secB",
    title: "Objectifs",
    kicker: "Section 2",
    fields: {
      obj3: { type: "textarea", label: "Ton objectif à 3 mois, le plus précis possible", required: true },
      obj12: { type: "textarea", label: "Ton objectif à 12 mois, le plus précis possible", required: true },
      plan: { type: "textarea", label: "En termes très simples et concrets, qu'est-ce que tu dois faire pour atteindre ces objectifs, et comment je peux t'aider là-dedans ?", required: true },
    },
    groups: [["obj3"], ["obj12"], ["plan"]],
  },
  {
    key: "secC",
    title: "Santé et récupération",
    kicker: "Section 3",
    fields: {
      fc_repos: { type: "number", label: "Ta fréquence cardiaque au repos si tu la connais", required: false },
      pas: { type: "number", label: "Ton nombre de pas moyen par jour", required: false, placeholder: "Regarde dans l'app Santé (iPhone) ou Fit (Android) de ton téléphone" },
      montre: { type: "text", label: "Tu as une montre ou bague connectée ? Si oui laquelle", required: false },
      stress: { type: "scale", label: "Ton niveau de stress en ce moment", required: true },
      sommeil_qualite: { type: "scale", label: "La qualité de ton sommeil", required: true },
      sommeil_heures: { type: "number", label: "Ton nombre d'heures de sommeil moyen par nuit", required: true },
      problemes_sante: { type: "textarea", label: "Des problèmes de santé, passés ou actuels, que je dois connaître ?", required: true, placeholder: 'Écris "aucun" si rien à signaler' },
      blessures: { type: "textarea", label: "Des blessures ou douleurs actuelles ou récurrentes ? Précise où et depuis quand", required: true, placeholder: 'Écris "aucune" si rien à signaler' },
    },
    groups: [["fc_repos", "pas"], ["montre"], ["stress"], ["sommeil_qualite"], ["sommeil_heures"], ["problemes_sante"], ["blessures"]],
  },
  {
    key: "secD",
    title: "Spécifique femmes",
    kicker: "Section 4",
    conditional: (a) => a.sexe === "Femme",
    fields: {
      cycle: { type: "number", label: "Durée moyenne de ton cycle (en jours)", required: true },
      contraceptif: { type: "text", label: "Tu utilises un contraceptif hormonal ? Si oui lequel", required: true, placeholder: 'Écris "aucun" si rien' },
    },
    groups: [["cycle"], ["contraceptif"]],
  },
  {
    key: "secE",
    title: "Nutrition",
    kicker: "Section 5",
    fields: {
      repas_actuel: { type: "number", label: "Combien de repas tu fais actuellement par jour", required: true },
      repas_ideal: { type: "number", label: "Combien de repas tu voudrais idéalement faire par jour", required: true },
      journee_type: { type: "textarea", label: "Décris une journée alimentaire type, le plus précisément possible", required: true },
      calories_macros: { type: "text", label: "Tu connais tes calories et tes macros actuelles ? Si oui donne les chiffres", required: true, placeholder: 'Écris "je ne sais pas" si non' },
      cheatmeals: { type: "number", label: "Combien de cheat meals tu fais par semaine en moyenne", required: true },
      impact_digestion: { type: "textarea", label: "Comment ça impacte ta digestion et tes performances à l'entraînement le lendemain", required: true },
      budget_complements: { type: "number", label: "Ton budget mensuel pour les compléments alimentaires (€)", required: true },
      aliments_deteste: { type: "textarea", label: "Les aliments que tu détestes et que je dois éviter", required: true, placeholder: 'Écris "aucun" si rien' },
      aliments_adore: { type: "textarea", label: "Les aliments que tu adores et que je peux intégrer", required: true },
      restrictions: { type: "textarea", label: "Des restrictions alimentaires : allergies, intolérances, religion, végétarien...", required: true, placeholder: 'Écris "aucune" si rien' },
      preference_plan: { type: "radio", label: "Tu préfères un plan alimentaire fixe ou des macros flexibles au quotidien ?", options: ["Plan fixe", "Macros flexibles", "Je ne sais pas"], required: true },
      preference_apport: { type: "radio", label: "Tu préfères un apport calorique linéaire chaque jour, ou qui varie selon les jours ?", options: ["Linéaire", "Qui varie selon les jours", "Je ne sais pas"], required: true },
    },
    groups: [["repas_actuel", "repas_ideal"], ["journee_type"], ["calories_macros"], ["cheatmeals"], ["impact_digestion"], ["budget_complements"], ["aliments_deteste"], ["aliments_adore"], ["restrictions"], ["preference_plan"], ["preference_apport"]],
  },
  {
    key: "secF",
    title: "Entraînement",
    kicker: "Section 6",
    fields: {
      seances_actuel: { type: "number", label: "Combien de séances tu fais actuellement par semaine", required: true },
      seances_voulu: { type: "number", label: "Combien de séances tu voudrais faire par semaine", required: true },
      duree_seance: { type: "radio", label: "Durée moyenne souhaitée par séance", options: ["30 à 45 min", "45 à 60 min", "60 à 90 min", "Plus de 90 min"], required: true },
      disponibilite: { type: "textarea", label: "Tes jours et horaires de disponibilité pour t'entraîner", required: true },
      cardio: { type: "text", label: "Le type de cardio que tu pratiques ou que tu préfères", required: true, placeholder: 'Écris "aucun" si rien' },
      routine_actuelle: { type: "textarea", label: "Ta routine d'entraînement actuelle, si tu en as une", required: true, placeholder: 'Écris "aucune" si rien' },
      mouvements_ok: { type: "textarea", label: "Des mouvements ou exercices qui fonctionnent particulièrement bien pour toi", required: true, placeholder: 'Écris "aucun" si rien' },
      mouvements_probleme: { type: "textarea", label: "Des mouvements qui posent problème, qui font mal, ou que tu veux éviter", required: true, placeholder: 'Écris "aucun" si rien' },
      split: { type: "radio", label: "Le split qui te convient le mieux", options: ["Push Pull Legs", "Upper Lower", "Full body", "Autre", "Je ne sais pas"], required: true },
      machines_pas_aimees: { type: "textarea", label: "Des machines ou exercices que tu n'aimes vraiment pas", required: true, placeholder: 'Écris "aucun" si rien' },
    },
    groups: [["seances_actuel", "seances_voulu"], ["duree_seance"], ["disponibilite"], ["cardio"], ["routine_actuelle"], ["mouvements_ok"], ["mouvements_probleme"], ["split"], ["machines_pas_aimees"]],
  },
  {
    // Détermine quel matériel peut réellement t'être proposé (voir
    // lib/plan-generator.ts) — avant, la fiche partait du principe que tout
    // le monde s'entraîne en salle, y compris pour les suggestions et le
    // constructeur de programme.
    key: "secG",
    title: "Ton lieu d'entraînement",
    kicker: "Section 7",
    fields: {
      lieu_entrainement: {
        type: "radio",
        label: "Où t'entraînes-tu principalement ?",
        options: ["En salle de sport", "À la maison, avec du matériel", "À la maison, sans matériel"],
        required: true,
      },
    },
    groups: [["lieu_entrainement"]],
  },
  {
    key: "secG2",
    title: "Ta salle de sport",
    kicker: "Section 7",
    conditional: (a) => a.lieu_entrainement === "En salle de sport",
    fields: {
      nom_salle: { type: "text", label: "Le nom ou le lien de ta salle", required: true },
    },
    groups: [["nom_salle"]],
  },
  {
    key: "secI",
    title: "Pour finir",
    kicker: "Section 9",
    fields: {
      autre: { type: "textarea", label: "Il y a autre chose que je dois savoir sur toi pour t'accompagner au mieux ?", required: false },
    },
    groups: [["autre"]],
  },
];

// Mapping question → colonne client_intake (utilisé par l'action serveur).
// Les champs absents de ce mapping (prenom, nom, poids, naissance→date_of_birth
// géré à part) sont traités individuellement dans l'action.
export const INTAKE_FIELD_MAP: Record<string, string> = {
  taille: "height_cm",
  metier: "occupation",
  horaires: "work_hours",
  obj3: "goal_3_months",
  obj12: "goal_12_months",
  plan: "how_coach_can_help",
  fc_repos: "resting_heart_rate",
  pas: "avg_daily_steps",
  montre: "wearable_device",
  stress: "stress_level",
  sommeil_qualite: "sleep_quality",
  sommeil_heures: "sleep_hours",
  problemes_sante: "health_issues",
  blessures: "injuries",
  cycle: "cycle_length_days",
  contraceptif: "hormonal_contraceptive",
  repas_actuel: "meals_current",
  repas_ideal: "meals_ideal",
  journee_type: "typical_day",
  calories_macros: "known_nutrition_text",
  cheatmeals: "cheat_meals_per_week",
  impact_digestion: "cheat_meal_impact",
  budget_complements: "supplement_budget",
  aliments_deteste: "disliked_foods",
  aliments_adore: "liked_foods",
  restrictions: "dietary_restrictions",
  seances_actuel: "sessions_current",
  seances_voulu: "sessions_desired",
  duree_seance: "session_duration",
  disponibilite: "availability",
  cardio: "cardio_preference",
  routine_actuelle: "current_routine",
  mouvements_ok: "exercises_that_work",
  mouvements_probleme: "exercises_problematic",
  split: "preferred_split",
  machines_pas_aimees: "disliked_equipment",
  lieu_entrainement: "training_access",
  nom_salle: "gym_name",
  autre: "additional_notes",
};

const NUMERIC_INTAKE_COLUMNS = new Set([
  "height_cm", "resting_heart_rate", "avg_daily_steps", "stress_level", "sleep_quality",
  "sleep_hours", "cycle_length_days", "meals_current", "meals_ideal", "cheat_meals_per_week",
  "supplement_budget", "sessions_current", "sessions_desired",
]);

export function isNumericIntakeColumn(column: string): boolean {
  return NUMERIC_INTAKE_COLUMNS.has(column);
}

const RADIO_TO_ENUM: Record<string, Record<string, string>> = {
  emploi_type: { Fixe: "fixe", Variable: "variable" },
  preference_plan: { "Plan fixe": "fixe", "Macros flexibles": "flexible" },
  preference_apport: { "Linéaire": "lineaire", "Qui varie selon les jours": "variable" },
  lieu_entrainement: {
    "En salle de sport": "salle",
    "À la maison, avec du matériel": "domicile_equipe",
    "À la maison, sans matériel": "domicile_minimal",
  },
};

export function mapRadioToEnum(key: string, value: string): string | null {
  const map = RADIO_TO_ENUM[key];
  if (!map) return value;
  return map[value] ?? null;
}
