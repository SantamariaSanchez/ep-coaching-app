// Extrait de app/api/cron/meal-reminders/route.ts pour être réutilisé par
// lib/daily-gate.ts (MASTERCLASS.md — bilan/repas obligatoires, 2026-08-15) :
// le verrou de repas doit connaître exactement les mêmes horaires/labels que
// la notification, sinon les deux dérivent l'un de l'autre avec le temps.

export const MEAL_SLOT_TIMES: Record<string, string> = {
  breakfast: "08:00",
  morning: "10:30",
  lunch: "12:30",
  afternoon: "16:00",
  preworkout: "17:30",
  postworkout: "19:00",
  dinner: "20:00",
};

export const MEAL_SLOT_LABELS: Record<string, string> = {
  breakfast: "petit-déjeuner",
  morning: "collation du matin",
  lunch: "déjeuner",
  afternoon: "collation de l'après-midi",
  preworkout: "repas pré-entraînement",
  postworkout: "repas post-entraînement",
  dinner: "dîner",
};

export const DOW_MAP = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"] as const;

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Heure de Paris en minutes depuis minuit + jour de semaine abrégé — gère
// automatiquement le changement d'heure été/hiver (Intl avec timeZone
// Europe/Paris), contrairement à un offset fixe. Voir lib/dates.ts pour le
// même principe appliqué au calcul de la date du jour.
export function parisNow(): { minutes: number; dow: (typeof DOW_MAP)[number] } {
  const now = new Date();
  const hhmm = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const parisDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
  const dowIndex = new Date(`${parisDate}T12:00:00Z`).getUTCDay();
  return { minutes: timeToMinutes(hhmm), dow: DOW_MAP[dowIndex] };
}
