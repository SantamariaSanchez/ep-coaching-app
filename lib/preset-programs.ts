import type { ProgramInput } from "@/utils/programs";

export interface PresetProgram {
  id: string;
  name: string;
  split: string;
  description: string;
  frequency: number;
  input: ProgramInput;
}

export const PRESET_PROGRAMS: PresetProgram[] = [
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
