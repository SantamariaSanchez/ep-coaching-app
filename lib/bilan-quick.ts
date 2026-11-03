import type { BilanField } from "@/lib/tracking-profile";
import type { DailyLog } from "@/utils/daily-logs";

// Bilan du jour rapide (components/tracking/QuickBilan.tsx), logique pure.
//
// Retour d'Emmanuel du 03/11/2026 : le poids s'enregistrait dès la saisie et
// la page considérait alors tout le bilan comme « rempli » ; le sommeil ne se
// tapait pas au clavier ; l'enregistrement à chaque tap était trop agressif.
// Désormais les réponses restent en brouillon jusqu'au bouton Enregistrer,
// et un bilan n'est « fait » que si ses infos essentielles sont là.

/** La réponse à cette question est-elle présente dans la journée ? */
export function fieldFilled(f: BilanField, l: Partial<DailyLog> | null | undefined): boolean {
  if (!l) return false;
  switch (f) {
    case "poids": return l.weight_morning != null;
    case "seance": return !!l.training_name;
    case "pas": return l.steps != null;
    case "energie": return l.energy != null;
    case "sommeil": return l.sleep_hours != null;
    case "digestion": return !!l.digestion;
    case "stress": return !!l.stress;
    case "humeur": return l.mood != null;
    case "faim": return !!l.hunger;
    case "courbatures": return l.soreness != null;
    case "hydratation": return l.water_l != null;
    case "sommeil_qualite": return l.sleep_rating != null;
    case "horaires_sommeil": return !!l.bedtime_actual && !!l.wake_time_actual;
    case "cardio_repos": return l.resting_hr != null;
  }
}

/**
 * Bilan du jour fait : les infos essentielles (version rapide) sont toutes
 * là, la pesée seulement un jour de pesée. Une simple ligne avec le poids ne
 * suffit plus à le déclarer rempli.
 */
export function isBilanDone(log: Partial<DailyLog> | null | undefined, minimum: BilanField[], weighToday: boolean): boolean {
  const needed = minimum.filter((f) => f !== "poids" || weighToday);
  if (!log || needed.length === 0) return false;
  return needed.every((f) => fieldFilled(f, log));
}

/** « 82,4 », « 82.4 », « 82 kg » → 82.4 ; null si illisible. */
export function parseDecimal(raw: string): number | null {
  const m = raw.replace(/\s/g, "").replace(",", ".").match(/^-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Durée de sommeil tapée librement → heures décimales.
 * « 7h30 », « 7 h 30 », « 7:30 », « 7,5 », « 7.5 », « 7 », « 450 min ».
 */
export function parseHours(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/\s/g, "");
  if (!s) return null;
  const min = s.match(/^(\d+)(?:min|mn|m)$/);
  if (min) return Math.round((Number(min[1]) / 60) * 100) / 100;
  const hm = s.match(/^(\d{1,2})(?:h|:)(\d{1,2})?(?:min|mn|m)?$/);
  if (hm) {
    const m = hm[2] ? Number(hm[2]) : 0;
    if (m >= 60) return null;
    return Math.round((Number(hm[1]) + m / 60) * 100) / 100;
  }
  const dec = s.match(/^\d+(?:[.,]\d+)?$/);
  if (dec) return Number(s.replace(",", "."));
  return null;
}

/** 7.5 → « 7 h 30 », 8 → « 8 h ». */
export function formatHours(n: number): string {
  const total = Math.round(n * 60);
  const h = Math.floor(total / 60), m = total % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

/** Champs modifiés par rapport à ce qui est déjà enregistré (seuls ceux-là partent). */
export function changedFields<T extends Record<string, unknown>>(saved: Partial<T>, draft: Partial<T>): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(draft) as (keyof T)[]) {
    const a = saved[k] ?? null, b = draft[k] ?? null;
    if (a !== b) out[k] = draft[k];
  }
  return out;
}
