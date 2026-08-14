// Item 50 (chantier 50 idées) : heures de silence pour les notifications
// push. Défaut raisonnable (22h-7h) appliqué en code plutôt qu'en base —
// NULL en base veut dire "pas de préférence explicite", pas "désactivé".
// Pour désactiver complètement, un utilisateur met la même heure aux deux
// bornes (0 durée, jamais "dans" la plage).
const DEFAULT_QUIET_START = 22;
const DEFAULT_QUIET_END = 7;

// Seul fuseau utilisé dans toute l'appli (dates fr-FR, crons calés dessus)
// — pas de champ timezone par profil à ce jour, donc pas de meilleure
// source pour "l'heure locale" de qui que ce soit.
const TIMEZONE = "Europe/Paris";

export function isWithinQuietHours(
  startHour: number | null | undefined,
  endHour: number | null | undefined,
  now: Date = new Date()
): boolean {
  const start = startHour ?? DEFAULT_QUIET_START;
  const end = endHour ?? DEFAULT_QUIET_END;
  if (start === end) return false;

  const currentHour = Number(
    new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", hour12: false, timeZone: TIMEZONE }).format(now)
  );

  if (start < end) {
    return currentHour >= start && currentHour < end;
  }
  // Plage qui traverse minuit (ex. 22 → 7)
  return currentHour >= start || currentHour < end;
}
