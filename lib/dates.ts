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
// Ajoute des minutes à une heure "HH:MM" (borne sur 24h). Sert à construire
// une fenêtre de tolérance ["HH:MM", "HH:MM" + N] pour les crons qui
// tournent désormais toutes les 15 min et décident eux-mêmes, en heure de
// Paris, s'ils sont dans leur créneau cible (voir MASTERCLASS.md — bug DST
// des crons pg_net à décalage UTC figé, corrigé le 2026-09-16 : un cron
// pg_cron déclenché une seule fois par jour à une heure UTC fixe sonnait à
// la bonne heure Paris seulement la moitié de l'année, pg_cron ne suivant
// aucun fuseau horaire et ne s'ajustant jamais seul au changement heure
// d'été/hiver).
export function addMinutesToHhmm(hhmm: string, minutesToAdd: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutesToAdd;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

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

// Semaine de coaching en cours depuis start_date (Idée #11, 2026-09-09,
// "semaine ronde de coaching" côté coach — voir ClientsSection.tsx). Vit
// ici plutôt que dupliquée localement : module pur, sans import serveur,
// donc réutilisable tel quel côté client ("use client") comme côté serveur —
// nécessaire pour l'afficher aussi sur l'espace du membre lui-même
// (brainstorm "onglet Aujourd'hui, version membre", 2026-09-10), sans
// risquer d'entraîner du code serveur dans le bundle client.
export function weekNumber(startDate: string | null): number | null {
  if (!startDate) return null;
  const weeks = Math.floor(
    (Date.now() - new Date(startDate + "T12:00:00").getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  return weeks >= 0 ? weeks + 1 : null;
}

// Salutation adaptée à l'heure plutôt qu'un "Bonjour" figé toute la
// journée (Idée #1, 2026-09-09, côté coach — voir MyDayCard.tsx). Vit ici
// plutôt qu'exportée depuis MyDayCard.tsx pour la même raison que
// weekNumber ci-dessus : réutilisée aussi côté membre (brainstorm
// "onglet Aujourd'hui, version membre", 2026-09-10) sans entraîner tout
// le module MyDayCard (composant du dashboard coach) dans le bundle
// client de l'espace membre.
export function timeAwareGreeting(hour: number): string {
  if (hour < 5) return "Bonne nuit";
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
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
