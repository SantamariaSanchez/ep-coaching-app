export type WarmupType = "push" | "pull" | "legs" | "full";

export interface WarmupExercise {
  name: string;
  sets: string;
  equipment: "poulie" | "élastique" | "machine" | "libre";
}

export interface WarmupRecommendation {
  articulations: string[];
  exercises: WarmupExercise[];
  tips: string;
}

export const WARMUP_RECOMMENDATIONS: Record<WarmupType, WarmupRecommendation> =
  {
    push: {
      articulations: ["Épaules", "Coudes", "Poignets"],
      exercises: [
        {
          name: "Rotation épaule poulie basse (cercles)",
          sets: "2x15 chaque sens",
          equipment: "poulie",
        },
        {
          name: "Face pull léger poulie haute",
          sets: "2x20",
          equipment: "poulie",
        },
        {
          name: "Élévation latérale élastique",
          sets: "2x15",
          equipment: "élastique",
        },
        {
          name: "Rotation externe épaule élastique",
          sets: "2x15",
          equipment: "élastique",
        },
        {
          name: "Extension triceps poulie légère",
          sets: "2x15",
          equipment: "poulie",
        },
        {
          name: "Flexion/extension poignets libres",
          sets: "30 secondes",
          equipment: "libre",
        },
        {
          name: "Rotation coudes libres",
          sets: "30 secondes",
          equipment: "libre",
        },
      ],
      tips: "Commence par les épaules avant tout. Augmente progressivement l'amplitude.",
    },
    pull: {
      articulations: ["Épaules", "Coudes", "Poignets"],
      exercises: [
        {
          name: "Tirage poulie haute très léger",
          sets: "2x20",
          equipment: "poulie",
        },
        {
          name: "Rotation interne/externe épaule élastique",
          sets: "2x15",
          equipment: "élastique",
        },
        {
          name: "Curl biceps élastique léger",
          sets: "2x20",
          equipment: "élastique",
        },
        { name: "Face pull poulie", sets: "2x20", equipment: "poulie" },
        {
          name: "Rotation scapulaire libre",
          sets: "30 secondes",
          equipment: "libre",
        },
        {
          name: "Étirement poignets libre",
          sets: "30 secondes",
          equipment: "libre",
        },
      ],
      tips: "Active les rhomboïdes et les rotateurs avant de charger.",
    },
    legs: {
      articulations: ["Hanches", "Genoux", "Chevilles"],
      exercises: [
        {
          name: "Leg extension machine très léger",
          sets: "2x20",
          equipment: "machine",
        },
        {
          name: "Leg curl machine très léger",
          sets: "2x20",
          equipment: "machine",
        },
        {
          name: "Abduction hanche machine ou élastique",
          sets: "2x20",
          equipment: "machine",
        },
        {
          name: "Squat au poids du corps profond",
          sets: "2x15",
          equipment: "libre",
        },
        {
          name: "Hip circle élastique",
          sets: "2x20 chaque sens",
          equipment: "élastique",
        },
        {
          name: "Rotation cheville libre",
          sets: "30 secondes chaque",
          equipment: "libre",
        },
        {
          name: "Fente marchée libre",
          sets: "10 chaque jambe",
          equipment: "libre",
        },
      ],
      tips: "Mobilise les hanches dans tous les axes. Chauffe les genoux progressivement.",
    },
    full: {
      articulations: ["Épaules", "Hanches", "Genoux", "Coudes"],
      exercises: [
        {
          name: "Rotation épaule complète libre",
          sets: "30 secondes",
          equipment: "libre",
        },
        {
          name: "Hip circle élastique",
          sets: "2x15",
          equipment: "élastique",
        },
        {
          name: "Squat au poids du corps",
          sets: "2x15",
          equipment: "libre",
        },
        {
          name: "Face pull poulie légère",
          sets: "2x15",
          equipment: "poulie",
        },
        {
          name: "Rotation cheville et poignet libres",
          sets: "30 secondes",
          equipment: "libre",
        },
      ],
      tips: "Parcours le corps de haut en bas. Amplitude maximale sans douleur.",
    },
  };

export function detectWarmupType(
  dayLabel: string,
  muscleGroups: string[]
): WarmupType {
  const label = dayLabel.toLowerCase();
  const groups = muscleGroups.map((g) => g.toLowerCase());

  if (
    label.includes("push") ||
    label.includes("pouss") ||
    label.includes("pec") ||
    groups.some((g) => ["pectoraux", "épaules", "triceps"].includes(g))
  ) {
    return "push";
  }
  if (
    label.includes("pull") ||
    label.includes("tir") ||
    label.includes("dos") ||
    groups.some((g) => ["dos", "biceps"].includes(g))
  ) {
    return "pull";
  }
  if (
    label.includes("leg") ||
    label.includes("jambe") ||
    label.includes("squat") ||
    label.includes("quad") ||
    groups.some((g) =>
      ["quadriceps", "ischio-jambiers", "fessiers", "mollets"].includes(g)
    )
  ) {
    return "legs";
  }
  return "full";
}

export const EQUIPMENT_COLORS: Record<WarmupExercise["equipment"], string> = {
  poulie: "#60a5fa",
  élastique: "#4ade80",
  machine: "#fbbf24",
  libre: "#a78bfa",
};
