// Formatage des dates et aperçus de la messagerie, partagé entre la liste
// des conversations (Server Component, exécuté sur Vercel en UTC) et le fil
// d'une conversation (Client Component, exécuté dans le navigateur).
//
// Pourquoi un fuseau explicite partout : sans timeZone, le serveur Vercel
// formatait l'heure en UTC (un message envoyé à 08:52 heure de Paris
// s'affichait "06:52" dans la liste). L'appli est 100% francophone, la
// référence est donc toujours Europe/Paris, côté serveur comme côté client,
// pour que la liste et le fil affichent exactement la même heure.

const PARIS = "Europe/Paris";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PARIS,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const clockFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: PARIS,
  hour: "2-digit",
  minute: "2-digit",
});

/** Jour calendaire à Paris d'un instant, au format "YYYY-MM-DD". */
export function parisDayKey(date: Date | string): string {
  return dayKeyFormatter.format(typeof date === "string" ? new Date(date) : date);
}

// Veille d'un jour "YYYY-MM-DD", calculée sur le calendrier et pas en
// retirant 24h à maintenant : les jours de changement d'heure durent 23h
// ou 25h, et "maintenant moins 24h" tombait alors sur le mauvais jour.
function previousDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

/** Heure "HH:MM" à Paris. */
export function formatClock(iso: string): string {
  return clockFormatter.format(new Date(iso));
}

/**
 * Libellé du séparateur de jour dans le fil : "Aujourd'hui", "Hier",
 * "Mardi 23 sept." (l'année n'apparaît que si ce n'est pas l'année en cours).
 */
export function formatDayLabel(iso: string, now: Date = new Date()): string {
  const key = parisDayKey(iso);
  const todayKey = parisDayKey(now);
  if (key === todayKey) return "Aujourd'hui";
  if (key === previousDayKey(todayKey)) return "Hier";
  const sameYear = key.slice(0, 4) === todayKey.slice(0, 4);
  const label = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS,
    weekday: "long",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(new Date(iso));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Horodatage compact pour la liste des conversations : l'heure si c'est
 * aujourd'hui, "Hier", sinon la date courte ("23 sept.", avec l'année si
 * elle diffère de l'année en cours).
 */
export function formatListTime(iso: string, now: Date = new Date()): string {
  const key = parisDayKey(iso);
  const todayKey = parisDayKey(now);
  if (key === todayKey) return formatClock(iso);
  if (key === previousDayKey(todayKey)) return "Hier";
  const sameYear = key.slice(0, 4) === todayKey.slice(0, 4);
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS,
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(new Date(iso));
}

/**
 * Aperçu d'un message selon son type. Une photo ou une vidéo n'a pas de
 * `content` : sans ce cas, l'aperçu était vide et la liste affichait
 * "Aucun message" pour une conversation pourtant active.
 */
export function messagePreview(type: string, content: string | null, maxLength = 50): string {
  if (type === "voice") return "Message vocal";
  if (type === "image") return "Photo";
  if (type === "video") return "Vidéo";
  const text = (content ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "Message";
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}
