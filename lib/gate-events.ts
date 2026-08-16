// Pont entre la page Nutrition et DailyGateOverlay.tsx (demande explicite
// 2026-08-16 : logger un repas doit débloquer l'appli tout de suite, pas
// seulement après avoir changé de page). Les deux composants sont montés à
// des endroits différents de l'arbre (l'overlay dans app/dashboard/layout.tsx,
// la vue nutrition dans la page) sans relation parent/enfant ni store
// partagé — un événement DOM global reste le pont le plus simple, sans
// ajouter de context React ni de dépendance entre les deux fichiers.
export const GATE_REFRESH_EVENT = "ep-gate-refresh";

export function notifyGateRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GATE_REFRESH_EVENT));
  }
}
