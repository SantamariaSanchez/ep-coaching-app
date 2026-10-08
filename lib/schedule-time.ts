// Fonctions de temps Europe/Paris partagées entre le cron de notification
// (app/api/cron/schedule-block-notify) et les server actions de l'agenda
// (app/dashboard/client/agenda/actions.ts) — un seul endroit pour ce calcul,
// pour ne pas risquer une dérive entre les deux si l'un est modifié sans
// l'autre.

export function parisDateStr(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(date);
}

export function parisTimeStr(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

// getDay() en Europe/Paris — 1 = lundi ... 7 = dimanche, même convention que
// day_of_week dans schedule_blocks (voir utils/agenda.ts).
export function parisIsoWeekday(date: Date): number {
  const w = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", weekday: "short" }).format(date);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[w] ?? 1;
}

// Un bloc créé ou modifié dont le jour tombe aujourd'hui ET dont l'heure de
// début est déjà passée ne doit PAS déclencher une notification immédiate au
// prochain passage du cron (app/api/cron/schedule-block-notify tourne toutes
// les 5 min et considère "dû" tout bloc notify=true dont l'heure est passée
// et jamais notifié aujourd'hui). Sans ce garde-fou, créer ou modifier un
// bloc l'après-midi pour un horaire du matin ("Repas pré-workout" 14h00, créé
// à 16h08) provoque une notification parasite immédiate au lieu d'attendre
// la vraie prochaine occurrence la semaine suivante — bug réel remonté le
// 2026-08-30 ("ça m'envoie des notifs à 16h42 pour le pré-workout").
export function isBlockTimeAlreadyPastToday(dayOfWeek: number, startTime: string): boolean {
  const now = new Date();
  if (parisIsoWeekday(now) !== dayOfWeek) return false;
  const nowTime = parisTimeStr(now) + ":00";
  return startTime <= nowTime;
}

// ── Fuseau horaire de chaque personne (2026-10-08) ──────────────────────
// Les rappels partaient à l'heure de Paris pour tout le monde : quelqu'un à
// Montréal ou à Dubaï recevait son « repas de 12h » au mauvais moment. Le
// fuseau est détecté sur le téléphone (user_settings.timezone) ; Paris reste
// la valeur par défaut tant qu'il n'est pas connu.
export const DEFAULT_TZ = "Europe/Paris";

export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

/** Date (AAAA-MM-JJ), heure (HH:MM) et jour ISO (1 = lundi) dans le fuseau donné. */
export function localParts(date: Date, tz: string): { date: string; time: string; isoDow: number } {
  const zone = safeTimeZone(tz);
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(date);
  const time = new Intl.DateTimeFormat("fr-FR", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
  const w = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short" }).format(date);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { date: d, time, isoDow: map[w] ?? 1 };
}

/** Minutes écoulées depuis une heure « HH:MM(:SS) » à partir de « HH:MM ». */
export function minutesBetween(start: string, now: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [nh, nm] = now.split(":").map(Number);
  return nh * 60 + nm - (sh * 60 + sm);
}
