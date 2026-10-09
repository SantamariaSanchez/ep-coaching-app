import type { ProgramInput } from "@/utils/programs";
import type { MemberPreferences } from "@/lib/personalization";

export interface PresetProgram {
  id: string;
  name: string;
  split: string;
  description: string;
  frequency: number;
  input: ProgramInput;
}

export const PRESET_PROGRAMS: PresetProgram[] = [
  // Les deux premiers sont pensés pour un membre qui démarre : jusqu'ici les
  // trois seuls programmes proposés étaient "Intermédiaire" (squat barre en
  // 5-6, développé couché lourd), rien pour quelqu'un qui débute ou qui n'a
  // pas de salle. Voir recommendPreset() plus bas.
  {
    id: "debutant2",
    name: "Débuter : Full Body 2 jours",
    split: "Full Body",
    description: "2 séances par semaine, environ 45 min. Machines et haltères, gestes simples, charges légères : tu apprends les mouvements et tu prends l'habitude avant de chercher la performance.",
    frequency: 2,
    input: {
      name: "Programme Débuter Full Body 2 jours",
      type: "Full Body",
      frequency: 2,
      days: [
        {
          day_label: "Séance A : Bases",
          exercises: [
            { name: "Presse à cuisses (leg press)", sets: 3, reps: "10-12", rir: 3, rest_seconds: 90, notes: "Pieds largeur d'épaules, descends tant que le bas du dos reste collé au dossier", muscle_group: "Quadriceps", muscle_subgroup: null, is_direct: true },
            { name: "Développé couché haltères", sets: 3, reps: "10-12", rir: 3, rest_seconds: 90, notes: "Charge légère pour apprendre la trajectoire, coudes à environ 45° du buste", muscle_group: "Pectoraux", muscle_subgroup: null, is_direct: true },
            { name: "Tirage vertical poulie haute (lat pulldown)", sets: 3, reps: "10-12", rir: 3, rest_seconds: 90, notes: "Tire la barre vers le haut de la poitrine, sans balancer le buste", muscle_group: "Dos", muscle_subgroup: null, is_direct: true },
            { name: "Leg curl assis", sets: 2, reps: "12-15", rir: 2, rest_seconds: 75, notes: null, muscle_group: "Ischio-jambiers", muscle_subgroup: null, is_direct: true },
            { name: "Planche (plank)", sets: 3, reps: "20-30 s", rir: null, rest_seconds: 60, notes: "Corps gainé de la tête aux talons, respire normalement", muscle_group: "Abdominaux", muscle_subgroup: null, is_direct: true },
          ],
        },
        {
          day_label: "Séance B : Bases",
          exercises: [
            { name: "Squat gobelet (goblet squat)", sets: 3, reps: "10-12", rir: 3, rest_seconds: 90, notes: "Haltère tenu contre la poitrine, descends aussi bas que tu restes dos droit", muscle_group: "Quadriceps", muscle_subgroup: null, is_direct: true },
            { name: "Tirage horizontal haltère (rowing unilatéral)", sets: 3, reps: "10-12", rir: 3, rest_seconds: 75, notes: "Un genou et une main sur le banc, tire le coude vers la hanche", muscle_group: "Dos", muscle_subgroup: null, is_direct: true },
            { name: "Développé militaire haltères", sets: 2, reps: "10-12", rir: 3, rest_seconds: 90, notes: "Assis, dos contre le dossier", muscle_group: "Épaules", muscle_subgroup: null, is_direct: true },
            { name: "Pont fessier (glute bridge)", sets: 3, reps: "12-15", rir: 2, rest_seconds: 60, notes: "Serre les fessiers en haut une seconde", muscle_group: "Fessiers", muscle_subgroup: null, is_direct: true },
            { name: "Dead bug", sets: 2, reps: "8-10", rir: null, rest_seconds: 60, notes: "Répétitions par côté. Bas du dos plaqué au sol pendant tout le mouvement", muscle_group: "Abdominaux", muscle_subgroup: null, is_direct: true },
          ],
        },
      ],
    },
  },
  {
    id: "maison",
    name: "Reprise à la maison, sans matériel",
    split: "Full Body",
    description: "2 séances par semaine, environ 30 min, au poids du corps. Pour reprendre en douceur sans salle ni matériel. Tu ajoutes une 3e séance quand ça devient facile.",
    frequency: 2,
    input: {
      name: "Programme Reprise maison",
      type: "Full Body",
      frequency: 2,
      days: [
        {
          day_label: "Séance A : Corps entier",
          exercises: [
            { name: "Squat sumo", sets: 3, reps: "12-15", rir: 3, rest_seconds: 60, notes: "Au poids du corps, pieds écartés, pointes légèrement vers l'extérieur", muscle_group: "Quadriceps", muscle_subgroup: null, is_direct: true },
            { name: "Pompes", sets: 3, reps: "6-12", rir: 2, rest_seconds: 75, notes: "Sur les genoux ou mains sur une table si besoin, c'est tout aussi utile", muscle_group: "Pectoraux", muscle_subgroup: null, is_direct: true },
            { name: "Pont fessier (glute bridge)", sets: 3, reps: "15", rir: 2, rest_seconds: 60, notes: "Serre les fessiers en haut une seconde", muscle_group: "Fessiers", muscle_subgroup: null, is_direct: true },
            { name: "Superman (renfo lombaire)", sets: 3, reps: "10-12", rir: 2, rest_seconds: 60, notes: "Allongé sur le ventre, décolle bras et jambes sans forcer sur la nuque", muscle_group: "Dos", muscle_subgroup: null, is_direct: true },
            { name: "Planche (plank)", sets: 3, reps: "20-30 s", rir: null, rest_seconds: 45, notes: "Sur les genoux si besoin", muscle_group: "Abdominaux", muscle_subgroup: null, is_direct: true },
          ],
        },
        {
          day_label: "Séance B : Corps entier",
          exercises: [
            { name: "Fentes avant", sets: 3, reps: "8-10", rir: 3, rest_seconds: 60, notes: "Répétitions par jambe. Appui sur un mur si l'équilibre est difficile", muscle_group: "Quadriceps", muscle_subgroup: null, is_direct: true },
            { name: "Pompes", sets: 3, reps: "6-12", rir: 2, rest_seconds: 75, notes: "Même variante que la séance A, essaie de faire une répétition de plus", muscle_group: "Pectoraux", muscle_subgroup: null, is_direct: true },
            { name: "Prone Y-T-W (plancher)", sets: 2, reps: "8", rir: null, rest_seconds: 60, notes: "8 de chaque lettre. Allongé sur le ventre, bras en Y puis T puis W, pouces vers le haut", muscle_group: "Dos", muscle_subgroup: null, is_direct: true },
            { name: "Pont fessier (glute bridge)", sets: 3, reps: "12", rir: 2, rest_seconds: 60, notes: "Sur une jambe dès que la version à deux jambes devient facile (12 répétitions par jambe)", muscle_group: "Fessiers", muscle_subgroup: null, is_direct: true },
            { name: "Dead bug", sets: 2, reps: "8-10", rir: null, rest_seconds: 45, notes: "Répétitions par côté. Bas du dos plaqué au sol pendant tout le mouvement", muscle_group: "Abdominaux", muscle_subgroup: null, is_direct: true },
          ],
        },
      ],
    },
  },
  {
    id: "ppl",
    name: "Push / Pull / Legs",
    split: "PPL",
    description: "3 séances par semaine. Tu alternes poussée, tirage et jambes pour récupérer efficacement entre les groupes musculaires.",
    frequency: 3,
    input: {
      name: "Programme PPL Intermédiaire",
      type: "PPL",
      frequency: 3,
      days: [
        {
          day_label: "Push : Pectoraux / Épaules / Triceps",
          exercises: [
            { name: "Développé couché barre", sets: 4, reps: "6-8", rir: 2, rest_seconds: 120, notes: "Barre, prise légèrement plus large que les épaules", muscle_group: "Pectoraux", muscle_subgroup: null, is_direct: true },
            { name: "Développé incliné haltères", sets: 3, reps: "8-10", rir: 2, rest_seconds: 90, notes: "Inclinaison 30-45°", muscle_group: "Pectoraux", muscle_subgroup: null, is_direct: true },
            { name: "Développé militaire haltères", sets: 3, reps: "8-10", rir: 2, rest_seconds: 90, notes: "Assis ou debout", muscle_group: "Épaules", muscle_subgroup: null, is_direct: true },
            { name: "Élévations latérales haltères", sets: 4, reps: "12-15", rir: 1, rest_seconds: 60, notes: "Légère flexion du coude, monter jusqu'à l'horizontale", muscle_group: "Épaules", muscle_subgroup: null, is_direct: false },
            { name: "Triceps poulie haute (corde)", sets: 3, reps: "12-15", rir: 1, rest_seconds: 60, notes: "Coudes fixes, extension complète", muscle_group: "Triceps", muscle_subgroup: null, is_direct: true },
          ],
        },
        {
          day_label: "Pull : Dos / Biceps",
          exercises: [
            { name: "Tractions (ou tirage vertical)", sets: 4, reps: "6-8", rir: 2, rest_seconds: 120, notes: "Tractions si possible, sinon tirage vertical prise large", muscle_group: "Dos", muscle_subgroup: null, is_direct: true },
            { name: "Rowing barre pronation", sets: 3, reps: "6-8", rir: 2, rest_seconds: 90, notes: "Dos à plat, tirage vers le nombril", muscle_group: "Dos", muscle_subgroup: null, is_direct: true },
            { name: "Tirage horizontal poulie basse", sets: 3, reps: "10-12", rir: 2, rest_seconds: 75, notes: "Prise neutre, omoplates serrées en fin de mouvement", muscle_group: "Dos", muscle_subgroup: null, is_direct: false },
            { name: "Curl barre", sets: 3, reps: "8-10", rir: 2, rest_seconds: 75, notes: "Pas d'élan, coudes fixes", muscle_group: "Biceps", muscle_subgroup: null, is_direct: true },
            { name: "Curl marteau haltères", sets: 3, reps: "10-12", rir: 1, rest_seconds: 60, notes: "Prise neutre, travail des brachial et brachio-radial", muscle_group: "Biceps", muscle_subgroup: null, is_direct: false },
          ],
        },
        {
          day_label: "Legs : Quadriceps / Ischio / Mollets",
          exercises: [
            { name: "Squat barre", sets: 4, reps: "6-8", rir: 2, rest_seconds: 150, notes: "Descente contrôlée, genoux dans l'axe des orteils", muscle_group: "Quadriceps", muscle_subgroup: null, is_direct: true },
            { name: "Presse jambes", sets: 3, reps: "8-10", rir: 2, rest_seconds: 90, notes: "Pieds à hauteur d'épaules, dos plaqué contre le dossier", muscle_group: "Quadriceps", muscle_subgroup: null, is_direct: false },
            { name: "Soulevé de terre jambes tendues", sets: 3, reps: "10-12", rir: 2, rest_seconds: 90, notes: "Dos neutre, descente contrôlée jusqu'à la mi-tibia", muscle_group: "Ischio-jambiers", muscle_subgroup: null, is_direct: true },
            { name: "Leg curl couché", sets: 3, reps: "10-12", rir: 1, rest_seconds: 75, notes: "Flexion complète, extension lente", muscle_group: "Ischio-jambiers", muscle_subgroup: null, is_direct: false },
            { name: "Mollets debout (presse ou barre)", sets: 4, reps: "12-15", rir: 1, rest_seconds: 60, notes: "Amplitude complète, maintien 1s en extension", muscle_group: "Mollets", muscle_subgroup: null, is_direct: true },
          ],
        },
      ],
    },
  },
  {
    id: "fullbody",
    name: "Full Body",
    split: "Full Body",
    description: "3 séances par semaine. Chaque séance sollicite l'ensemble du corps avec des mouvements polyarticulaires. Idéal pour consolider les bases.",
    frequency: 3,
    input: {
      name: "Programme Full Body Intermédiaire",
      type: "Full Body",
      frequency: 3,
      days: [
        {
          day_label: "Séance A : Force",
          exercises: [
            { name: "Squat barre", sets: 4, reps: "5-6", rir: 2, rest_seconds: 150, notes: "Mouvement fondamental, priorité à la technique", muscle_group: "Quadriceps", muscle_subgroup: null, is_direct: true },
            { name: "Développé couché barre", sets: 4, reps: "5-6", rir: 2, rest_seconds: 120, notes: "Descente jusqu'au sternum, pas de rebond", muscle_group: "Pectoraux", muscle_subgroup: null, is_direct: true },
            { name: "Tractions (ou tirage vertical)", sets: 4, reps: "5-6", rir: 2, rest_seconds: 120, notes: "Amplitude complète, montée contrôlée", muscle_group: "Dos", muscle_subgroup: null, is_direct: true },
            { name: "Développé militaire barre", sets: 3, reps: "6-8", rir: 2, rest_seconds: 90, notes: "Debout ou assis, dos neutre", muscle_group: "Épaules", muscle_subgroup: null, is_direct: true },
            { name: "Curl barre", sets: 3, reps: "8-10", rir: 2, rest_seconds: 75, notes: "Coudes fixes", muscle_group: "Biceps", muscle_subgroup: null, is_direct: true },
          ],
        },
        {
          day_label: "Séance B : Volume",
          exercises: [
            { name: "Soulevé de terre roumain", sets: 4, reps: "8-10", rir: 2, rest_seconds: 120, notes: "Jambes légèrement fléchies, hanches en arrière", muscle_group: "Ischio-jambiers", muscle_subgroup: null, is_direct: true },
            { name: "Développé incliné haltères", sets: 3, reps: "8-10", rir: 2, rest_seconds: 90, notes: "Inclinaison 30°, contrôle en descente", muscle_group: "Pectoraux", muscle_subgroup: null, is_direct: true },
            { name: "Rowing haltère unilatéral", sets: 3, reps: "8-10", rir: 2, rest_seconds: 90, notes: "Appui sur un banc, dos plat", muscle_group: "Dos", muscle_subgroup: null, is_direct: true },
            { name: "Élévations latérales haltères", sets: 3, reps: "12-15", rir: 1, rest_seconds: 60, notes: null, muscle_group: "Épaules", muscle_subgroup: null, is_direct: false },
            { name: "Triceps poulie haute (corde)", sets: 3, reps: "12-15", rir: 1, rest_seconds: 60, notes: null, muscle_group: "Triceps", muscle_subgroup: null, is_direct: true },
          ],
        },
        {
          day_label: "Séance C : Mixte",
          exercises: [
            { name: "Presse jambes", sets: 4, reps: "10-12", rir: 2, rest_seconds: 90, notes: "Pieds légèrement hauts pour plus d'ischio", muscle_group: "Quadriceps", muscle_subgroup: null, is_direct: false },
            { name: "Dips lestés (ou non)", sets: 3, reps: "8-10", rir: 2, rest_seconds: 90, notes: "Légèrement penché vers l'avant pour les pectoraux", muscle_group: "Pectoraux", muscle_subgroup: null, is_direct: true },
            { name: "Tirage horizontal poulie basse", sets: 3, reps: "10-12", rir: 2, rest_seconds: 75, notes: "Prise neutre, omoplates actives", muscle_group: "Dos", muscle_subgroup: null, is_direct: false },
            { name: "Leg curl couché", sets: 3, reps: "10-12", rir: 1, rest_seconds: 75, notes: null, muscle_group: "Ischio-jambiers", muscle_subgroup: null, is_direct: false },
            { name: "Curl haltères incliné", sets: 3, reps: "10-12", rir: 1, rest_seconds: 60, notes: "Assis incliné à 45°, grand étirement du biceps", muscle_group: "Biceps", muscle_subgroup: null, is_direct: true },
          ],
        },
      ],
    },
  },
  {
    id: "upperlower",
    name: "Upper / Lower",
    split: "Upper / Lower",
    description: "4 séances par semaine. Tu alternes séances haut du corps et bas du corps pour plus de volume et de fréquence sur chaque groupe.",
    frequency: 4,
    input: {
      name: "Programme Upper/Lower Intermédiaire",
      type: "Upper/Lower",
      frequency: 4,
      days: [
        {
          day_label: "Upper A : Force haut du corps",
          exercises: [
            { name: "Développé couché barre", sets: 4, reps: "5-6", rir: 2, rest_seconds: 120, notes: "Charge lourde, technique prioritaire", muscle_group: "Pectoraux", muscle_subgroup: null, is_direct: true },
            { name: "Tractions (ou tirage vertical)", sets: 4, reps: "5-6", rir: 2, rest_seconds: 120, notes: null, muscle_group: "Dos", muscle_subgroup: null, is_direct: true },
            { name: "Développé militaire barre", sets: 3, reps: "6-8", rir: 2, rest_seconds: 90, notes: null, muscle_group: "Épaules", muscle_subgroup: null, is_direct: true },
            { name: "Rowing barre", sets: 3, reps: "6-8", rir: 2, rest_seconds: 90, notes: "Tirage vers le nombril, dos à plat", muscle_group: "Dos", muscle_subgroup: null, is_direct: false },
          ],
        },
        {
          day_label: "Lower A : Force bas du corps",
          exercises: [
            { name: "Squat barre", sets: 5, reps: "5", rir: 2, rest_seconds: 150, notes: "Priorité à la technique, charge progressive", muscle_group: "Quadriceps", muscle_subgroup: null, is_direct: true },
            { name: "Soulevé de terre roumain", sets: 4, reps: "6-8", rir: 2, rest_seconds: 120, notes: "Maintien du dos neutre tout au long du mouvement", muscle_group: "Ischio-jambiers", muscle_subgroup: null, is_direct: true },
            { name: "Presse jambes", sets: 3, reps: "10-12", rir: 2, rest_seconds: 90, notes: null, muscle_group: "Quadriceps", muscle_subgroup: null, is_direct: false },
            { name: "Leg curl couché", sets: 3, reps: "10-12", rir: 2, rest_seconds: 75, notes: null, muscle_group: "Ischio-jambiers", muscle_subgroup: null, is_direct: false },
          ],
        },
        {
          day_label: "Upper B : Volume haut du corps",
          exercises: [
            { name: "Développé incliné haltères", sets: 3, reps: "8-10", rir: 2, rest_seconds: 90, notes: null, muscle_group: "Pectoraux", muscle_subgroup: null, is_direct: true },
            { name: "Rowing haltère unilatéral", sets: 3, reps: "8-10", rir: 2, rest_seconds: 90, notes: "3 séries de chaque côté", muscle_group: "Dos", muscle_subgroup: null, is_direct: true },
            { name: "Élévations latérales haltères", sets: 4, reps: "12-15", rir: 1, rest_seconds: 60, notes: null, muscle_group: "Épaules", muscle_subgroup: null, is_direct: false },
            { name: "Curl barre", sets: 3, reps: "8-10", rir: 2, rest_seconds: 75, notes: null, muscle_group: "Biceps", muscle_subgroup: null, is_direct: true },
            { name: "Triceps poulie haute (corde)", sets: 3, reps: "12-15", rir: 1, rest_seconds: 60, notes: null, muscle_group: "Triceps", muscle_subgroup: null, is_direct: true },
          ],
        },
        {
          day_label: "Lower B : Volume bas du corps",
          exercises: [
            { name: "Presse jambes pieds hauts", sets: 4, reps: "10-12", rir: 2, rest_seconds: 90, notes: "Pieds hauts pour maximiser les ischio-jambiers", muscle_group: "Ischio-jambiers", muscle_subgroup: null, is_direct: false },
            { name: "Fentes marchées haltères", sets: 3, reps: "10-12", rir: 2, rest_seconds: 90, notes: "8-10 pas de chaque côté", muscle_group: "Quadriceps", muscle_subgroup: null, is_direct: false },
            { name: "Leg curl assis", sets: 3, reps: "12-15", rir: 1, rest_seconds: 75, notes: null, muscle_group: "Ischio-jambiers", muscle_subgroup: null, is_direct: false },
            { name: "Mollets debout", sets: 4, reps: "12-15", rir: 1, rest_seconds: 60, notes: "Amplitude complète, 1s de maintien en haut", muscle_group: "Mollets", muscle_subgroup: null, is_direct: true },
          ],
        },
      ],
    },
  },
];

export interface PresetRecommendation {
  preset: PresetProgram;
  reason: string;
}

// Programme de départ conseillé à partir des réponses au quiz d'onboarding
// (lib/personalization.ts). Mêmes principes que derivePersonalization() :
// des règles simples et explicables, jamais une décision cachée. La raison
// est affichée telle quelle à la personne pour qu'elle sache pourquoi ce
// programme et pas un autre, et elle peut toujours en changer.
export function recommendPreset(
  prefs: Partial<MemberPreferences> | null | undefined
): PresetRecommendation {
  const byId = (id: string) => PRESET_PROGRAMS.find((p) => p.id === id)!;
  const level = prefs?.experience_level ?? null;
  const goal = prefs?.primary_goal ?? null;
  const freq = prefs?.training_frequency ?? null;

  // Quiz passé sans réponse : on ne sait rien, donc le départ le plus
  // simple plutôt qu'un programme "Intermédiaire" à barre lourde.
  if (!level && !goal && !freq) {
    return {
      preset: byId("debutant2"),
      reason: "Le départ le plus simple : 2 séances par semaine qui font travailler tout le corps. Tu pourras en changer à tout moment.",
    };
  }

  if (freq === "0" || goal === "remise_en_forme") {
    return {
      preset: byId("maison"),
      reason: goal === "remise_en_forme"
        ? "Tu veux reprendre en douceur : 2 séances courtes à la maison, sans matériel, pour démarrer sans pression."
        : "Tu ne t'entraînes pas encore : 2 séances courtes à la maison, sans matériel, c'est le plus simple pour commencer.",
    };
  }
  if (level === "debutant") {
    return {
      preset: byId("debutant2"),
      reason: "Tu débutes : 2 séances simples par semaine pour apprendre les mouvements et prendre l'habitude.",
    };
  }
  if (freq === "1-2") {
    return {
      preset: byId("debutant2"),
      reason: "Tu vises 1 à 2 séances par semaine : un full body sur 2 jours fait travailler tout le corps à chaque fois.",
    };
  }
  if (freq === "5+" || (freq === "3-4" && level === "confirme")) {
    return {
      preset: byId("upperlower"),
      reason: "Tu peux t'entraîner souvent : 4 séances haut et bas du corps pour plus de volume sur chaque muscle.",
    };
  }
  if (goal === "prise_muscle") {
    return {
      preset: byId("ppl"),
      reason: "Tu veux prendre du muscle sur 3 séances : poussée, tirage et jambes, chaque groupe a le temps de récupérer.",
    };
  }
  return {
    preset: byId("fullbody"),
    reason: "3 séances corps entier par semaine, la base la plus solide pour progresser sur tout.",
  };
}
