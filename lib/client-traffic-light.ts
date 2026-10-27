// Feu vert / orange / rouge d'un client, tel que l'enseigne le Mastermind
// pour piloter le suivi : vert, il avance, on célèbre ; orange, il stagne,
// on demande ce qui a changé ; rouge, il a du mal à suivre, on demande
// comment simplifier le plan. Module pur, testé dans
// lib/__tests__/client-traffic-light.test.ts.

export type TrafficLight = "vert" | "orange" | "rouge";

export interface LightAlert {
  type: string;
  severity: "high" | "medium" | "low";
}

/** Signaux « du mal à suivre » : exécution du plan (bilan, repas, séances, récupération). */
const STRUGGLE_TYPES = new Set([
  "checkin_missing",
  "bilan_missing",
  "nutrition_adherence",
  "calories_low",
  "training_missed",
  "recovery_poor",
]);

export function classifyClient(alerts: readonly LightAlert[]): TrafficLight {
  if (alerts.length === 0) return "vert";
  if (alerts.some((a) => a.severity === "high" || STRUGGLE_TYPES.has(a.type))) return "rouge";
  return "orange";
}

export const TRAFFIC_LIGHT_QUESTION: Record<TrafficLight, string> = {
  vert: "Il avance : célèbre sa victoire de la semaine.",
  orange: "Il stagne : demande-lui ce qui a changé.",
  rouge: "Il a du mal à suivre : demande-lui comment on simplifie le plan.",
};

export const TRAFFIC_LIGHT_LABEL: Record<TrafficLight, string> = {
  vert: "Vert",
  orange: "Orange",
  rouge: "Rouge",
};
