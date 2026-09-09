// MASTERCLASS.md Axe L : "aujourd'hui" calculé côté serveur avec
// `new Date().toISOString().split("T")[0]` donne la date en UTC, pas celle
// de l'utilisateur. Cette appli est 100% francophone (voir AGENTS.md) et
// Vercel exécute son code en UTC — entre minuit et 1h/2h du matin heure de
// Paris (selon heure d'été/hiver), le serveur croit encore être hier.
// Pendant cette fenêtre, tout ce qui dépend d'un "aujourd'hui" calculé
// côté serveur (nutrition, pas, séances, bilan, habitudes...) pointait sur
// la mauvaise date pour l'utilisateur.
//
// `Intl.DateTimeFormat` avec `timeZone: "Europe/Paris"` gère automatiquement
// le passage heure d'été/hiver, contrairement à un simple décalage fixe
// (+1 ou +2h) qui serait faux la moitié de l'année.
export function todayInParis(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return `${year}-${month}-${day}`;
}

// Fenêtre de rattrapage pour un bilan quotidien (demande explicite
// 2026-08-17 : "même si on loupe un jour, on peut logger quand même par la
// suite les jours passés"). Avant ce fix, app/dashboard/client/bilan/
// actions.ts et app/dashboard/coach/moi/bilan/actions.ts n'autorisaient
// que aujourd'hui ou hier — une tolérance pensée à l'origine pour absorber
// un formulaire resté ouvert jusqu'après minuit (MASTERCLASS Axe L), pas
// pour un vrai rattrapage de plusieurs jours manqués. 30 jours : assez
// large pour rattraper une semaine chargée, borné pour ne pas permettre de
// réécrire un historique ancien sans limite.
export const BILAN_BACKFILL_DAYS = 30;

// Idée "onglet Aujourd'hui" (2026-09-09) : "prochain créneau" de l'agenda a
// besoin du jour ISO (1=lundi...7=dimanche, même convention que
// schedule_blocks.day_of_week) et de l'heure courante, tous deux en heure de
// Paris — même raisonnement que todayInParis ci-dessus, `new Date().getDay()`
// donnerait le jour du serveur (UTC), pas celui de l'utilisateur.
export function nowInParis(): { isoDow: number; hhmm: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const weekdayShort = parts.find((p) => p.type === "weekday")!.value;
  const hour = parts.find((p) => p.type === "hour")!.value;
  const minute = parts.find((p) => p.type === "minute")!.value;
  const DOW_MAP: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { isoDow: DOW_MAP[weekdayShort] ?? 1, hhmm: `${hour}:${minute}` };
}

// MASTERCLASS.md Axe L, variante "limite de débit par jour" plutôt que
// "quelle date écrire" : utils/insert-notification.ts (alreadyNotifiedToday)
// calculait sa borne "minuit" avec `new Date().setUTCHours(0,0,0,0)` —
// minuit UTC, pas minuit Paris. Entre minuit et 1h/2h du matin heure de
// Paris, cette borne UTC retombe sur la veille (jusqu'à 23h plus tôt que le
// vrai minuit Paris), donc une notif envoyée tard la veille comptait encore
// comme "déjà envoyée aujourd'hui" et bloquait à tort la vraie notif du
// nouveau jour Paris. Dérivé du même Intl.DateTimeFormat que nowInParis
// ci-dessus (fiable même à cheval sur un changement heure d'été/hiver) :
// on lit l'heure/minute/seconde Paris actuelles et on les retranche de
// l'instant présent pour retomber exactement sur minuit Paris, exprimé en
// UTC.
export function startOfTodayInParis(): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")!.value);
  const m = Number(parts.find((p) => p.type === "minute")!.value);
  const s = Number(parts.find((p) => p.type === "second")!.value);
  const msSinceParisMidnight = ((h * 60 + m) * 60 + s) * 1000 + now.getMilliseconds();
  return new Date(now.getTime() - msSinceParisMidnight);
}

export function isWithinBilanBackfillWindow(logDate: string, maxDaysBack: number = BILAN_BACKFILL_DAYS): boolean {
  const today = todayInParis();
  if (logDate > today) return false; // jamais dans le futur
  const [ty, tm, td] = today.split("-").map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const [ly, lm, ld] = logDate.split("-").map(Number);
  const logUtc = Date.UTC(ly, lm - 1, ld);
  const daysBack = Math.round((todayUtc - logUtc) / 86_400_000);
  return daysBack >= 0 && daysBack <= maxDaysBack;
}
