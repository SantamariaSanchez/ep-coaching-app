// Validation d'une saisie de cycle (cliente ou coach). Construit un objet
// neuf champ par champ : jamais d'étalement de ce qu'envoie le navigateur,
// sinon une requête forgée pouvait glisser son propre client_id et écrire
// dans le compte de quelqu'un d'autre.

export const PERIOD_FLOWS = ["leger", "moyen", "abondant"] as const;
export const PERIOD_SYMPTOMS = ["Douleurs", "Fatigue", "Ballonnements", "Sautes d'humeur", "Fringales", "Migraines"] as const;
const NOTES_MAX = 500;
/** Durée de règles au-delà de laquelle la date de fin est sûrement une faute de saisie. */
const PERIOD_MAX_DAYS = 15;

export interface PeriodInput {
  start_date: string;
  end_date: string | null;
  flow: (typeof PERIOD_FLOWS)[number] | null;
  symptoms: string[];
  notes: string | null;
}

function isDay(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

const dayMs = (v: string) => Date.parse(`${v}T12:00:00Z`);

export function sanitizePeriodInput(raw: unknown, today: string): { ok: true; value: PeriodInput } | { ok: false; error: string } {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (!isDay(o.start_date)) return { ok: false, error: "Indique une date de début valide." };
  const start = o.start_date;
  if (dayMs(start) > dayMs(today)) return { ok: false, error: "La date de début ne peut pas être dans le futur." };

  let end: string | null = null;
  if (o.end_date !== null && o.end_date !== undefined && o.end_date !== "") {
    if (!isDay(o.end_date)) return { ok: false, error: "La date de fin n'est pas valide." };
    end = o.end_date;
    const days = (dayMs(end) - dayMs(start)) / 86400000;
    if (days < 0) return { ok: false, error: "La date de fin est avant la date de début." };
    if (days >= PERIOD_MAX_DAYS) return { ok: false, error: "La date de fin semble trop loin de la date de début." };
  }

  const flow = PERIOD_FLOWS.includes(o.flow as never) ? (o.flow as PeriodInput["flow"]) : null;
  const symptoms = Array.isArray(o.symptoms)
    ? [...new Set(o.symptoms.filter((s): s is string => PERIOD_SYMPTOMS.includes(s as never)))]
    : [];
  const notes = typeof o.notes === "string" && o.notes.trim() ? o.notes.trim().slice(0, NOTES_MAX) : null;

  return { ok: true, value: { start_date: start, end_date: end, flow, symptoms, notes } };
}
