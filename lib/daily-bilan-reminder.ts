// Rappel du bilan du jour (audit 2026-11-13 : « même moi je ne le fais pas »).
// Vise seulement les personnes qui ont déjà fait un bilan dans les 14 derniers
// jours mais pas aujourd'hui : on relance l'habitude, on ne spamme pas ceux
// qui n'ont jamais commencé.

export const DAILY_BILAN_REMINDER_HHMM = "21:30";

export function whoNeedsBilanReminder(recent: { client_id: string; log_date: string }[], today: string): string[] {
  const doneToday = new Set(recent.filter((r) => r.log_date === today).map((r) => r.client_id));
  return [...new Set(recent.map((r) => r.client_id))].filter((id) => !doneToday.has(id));
}

export function bilanReminderUrl(role: string | null | undefined): string {
  return role === "coach" ? "/dashboard/coach/moi/bilan" : "/dashboard/client/bilan";
}
