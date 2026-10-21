import { isBlockOnDate } from "@/lib/agenda-day";
import { blockKind, mealSlotOf } from "@/lib/agenda-engine";

// Heures des repas posées dans l'agenda pour une date (calcul pur, mêmes
// règles que getAgendaMealTimes) : lues côté serveur au rendu de la page
// nutrition, pour que le repas du moment affiche tout de suite le même
// « quand » que l'agenda, sans aller-retour depuis le navigateur. Sert aussi
// à l'aperçu « Voir comme mon client », qui doit montrer l'agenda du client
// et jamais celui du coach connecté.

type MealBlock = {
  day_of_week: number;
  specific_date?: string | null;
  skipped_dates?: string[] | null;
  start_time: string;
  label: string;
  icon: string | null;
  link_ref?: string | null;
};

export function mealTimesForDate(blocks: MealBlock[], date: string): Record<string, string> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return {};
  const w = new Date(`${date}T12:00:00Z`).getUTCDay();
  const dow = w === 0 ? 7 : w;
  const out: Record<string, string> = {};
  const list = blocks.filter((b) => isBlockOnDate(b, date, dow)).sort((a, c) => a.start_time.localeCompare(c.start_time));
  for (const b of list) {
    if (blockKind(b) !== "repas") continue;
    const slot = mealSlotOf(b);
    if (!out[slot]) out[slot] = b.start_time.slice(0, 5);
  }
  return out;
}
