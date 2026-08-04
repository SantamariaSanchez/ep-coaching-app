// Types + logique pure (aucun import serveur) pour le système de phases de
// coaching — extraits de lib/coaching-phase.ts pour que les composants
// client (ex. CoachingPhasePanel.tsx) puissent importer les types et
// generateCoachingPhaseSuggestions sans entraîner createServerSupabase
// (next/headers) dans le bundle navigateur, ce qui casse le build Next.js.
// Même découpage que lib/daily-logs-helpers.ts / utils/daily-logs.ts.
//
// ── Philosophie ──────────────────────────────────────────────────────────
// Même principe que lib/client-suggestions.ts : pas d'IA, un jeu de règles
// simples et explicables à partir de ce que le client a réellement logué.
// Rien de tout ceci n'est jamais exposé côté client (voir
// supabase/migrations/20260804e_coaching_phases.sql : la table dédiée n'a
// aucune policy RLS lisible par le client).
//
// ── Phases retenues (à ajuster librement par le fondateur) ────────────────
// - "calibrage"    : les 2 à 3 premières semaines d'un client fraîchement
//                     coaché (abonnement actif). Le coach vérifie que le
//                     client suit vraiment le programme avant d'investir du
//                     temps à optimiser quoi que ce soit. C'est la seule
//                     phase où des signaux d'adhérence détaillés sont
//                     calculés (voir computeCalibrationSignals).
// - "optimisation" : une fois l'adhérence confirmée en calibrage. Le coach
//                     affine programme/nutrition pour maximiser les
//                     résultats. Aucun nouveau signal détaillé recalculé
//                     ici : le moteur d'alertes déjà en place
//                     (lib/coach-analytics.ts, section "Alertes urgentes" du
//                     dashboard coach) surveille déjà l'adhérence en continu
//                     pour tous les clients actifs quelle que soit leur
//                     phase — inutile de dupliquer cette logique.
// - "performance"  : phase optionnelle, pour un client avec une adhérence
//                     longue et solide en optimisation (typiquement en vue
//                     d'une échéance ou d'une recherche de résultats
//                     maximaux). Purement une étiquette de suivi pour
//                     l'instant, aucun calcul de signal dédié.
//
// La transition entre phases est TOUJOURS manuelle (bouton coach) : le
// système suggère, il ne décide jamais à la place du coach.

export type CoachingPhase = "calibrage" | "optimisation" | "performance";

export const PHASE_LABELS: Record<CoachingPhase, string> = {
  calibrage: "Calibrage",
  optimisation: "Optimisation",
  performance: "Performance",
};

export const PHASE_DESCRIPTIONS: Record<CoachingPhase, string> = {
  calibrage: "Vérifie que le client suit vraiment le programme avant d'aller plus loin.",
  optimisation: "Adhérence confirmée, place à l'ajustement fin du programme et de la nutrition.",
  performance: "Phase avancée, orientée résultats maximaux ou échéance proche.",
};

const PHASE_ORDER: CoachingPhase[] = ["calibrage", "optimisation", "performance"];

export function nextPhase(phase: CoachingPhase): CoachingPhase | null {
  const idx = PHASE_ORDER.indexOf(phase);
  return idx >= 0 && idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : null;
}

export interface CoachingPhaseState {
  phase: CoachingPhase;
  since: string; // ISO timestamp (started_at de la ligne ouverte)
}

export interface CoachingPhaseHistoryEntry {
  id: string;
  phase: CoachingPhase;
  started_at: string;
  ended_at: string | null;
  note: string | null;
}

// ok = null veut dire "pas assez de recul ou pas applicable" — jamais
// compté ni pour ni contre le client dans les suggestions.
export interface AdherenceSignal {
  id: string;
  label: string;
  ok: boolean | null;
  detail: string;
}

export interface PhaseSuggestion {
  id: string;
  severity: "info" | "warning";
  text: string;
}

function ageInDays(sinceIso: string): number {
  return Math.floor((Date.now() - new Date(sinceIso).getTime()) / (24 * 60 * 60 * 1000));
}

// Suggestions de décision pour le coach — règles simples, jamais une note
// unique et absconse. "warning" = mérite une action assez rapide, "info" =
// à prendre en compte / décision à envisager quand le coach a un moment.
export function generateCoachingPhaseSuggestions(
  phaseState: CoachingPhaseState,
  signals: AdherenceSignal[]
): PhaseSuggestion[] {
  const s: PhaseSuggestion[] = [];
  const ageDays = ageInDays(phaseState.since);
  const ageWeeks = Math.max(1, Math.round(ageDays / 7));

  if (phaseState.phase === "calibrage") {
    const applicable = signals.filter((sig) => sig.ok !== null);
    const okCount = applicable.filter((sig) => sig.ok).length;

    const sessionsSignal = signals.find((sig) => sig.id === "sessions");
    if (sessionsSignal?.ok === false) {
      s.push({
        id: "calibrage-sessions-faible",
        severity: "warning",
        text: `Séances insuffisamment loguées en calibrage (${sessionsSignal.detail}), envisage un appel pour comprendre ce qui bloque.`,
      });
    }

    const nutritionSignal = signals.find((sig) => sig.id === "nutrition");
    if (nutritionSignal?.ok === false) {
      s.push({
        id: "calibrage-nutrition-faible",
        severity: "warning",
        text: `Nutrition peu loguée en calibrage (${nutritionSignal.detail}), vérifie que le client sait bien utiliser le suivi alimentaire.`,
      });
    }

    const bilanSignal = signals.find((sig) => sig.id === "bilan");
    if (bilanSignal?.ok === false) {
      s.push({
        id: "calibrage-bilan-faible",
        severity: "info",
        text: `Bilan quotidien peu rempli (${bilanSignal.detail}), un rappel court suffit souvent à relancer l'habitude.`,
      });
    }

    const checkinSignal = signals.find((sig) => sig.id === "checkin");
    if (checkinSignal?.ok === false) {
      s.push({
        id: "calibrage-checkin-faible",
        severity: "warning",
        text: `Check-in hebdo pas à jour (${checkinSignal.detail}), relance le client avant la fin de la semaine.`,
      });
    }

    // Calibrage qui traîne en longueur sans adhérence claire (3 semaines et
    // plus, moitié ou moins des signaux applicables au vert) : ça mérite
    // plus qu'un rappel ponctuel, un vrai point avec le client.
    if (ageDays >= 21 && applicable.length > 0 && okCount <= applicable.length / 2) {
      s.push({
        id: "calibrage-prolonge",
        severity: "warning",
        text: `Calibrage depuis ${ageWeeks} semaines sans adhérence claire, envisage un appel de recadrage ou de vérifier que le format actuel convient vraiment au client.`,
      });
    }

    // Au moins 2 semaines de calibrage et tous les signaux applicables au
    // vert : assez de recul pour proposer la suite.
    if (ageDays >= 14 && applicable.length > 0 && okCount === applicable.length) {
      s.push({
        id: "calibrage-pret",
        severity: "info",
        text: `Adhérence solide depuis le début du calibrage (${ageWeeks} semaines), prêt à passer en phase Optimisation ?`,
      });
    }
  }

  // Optimisation longue (8 semaines et plus) : à ce stade le moteur
  // d'alertes général (lib/coach-analytics.ts) a déjà largement eu
  // l'occasion de signaler un décrochage éventuel, donc ici on se contente
  // de rappeler que la phase Performance existe si ça correspond au client.
  if (phaseState.phase === "optimisation" && ageDays >= 56) {
    s.push({
      id: "optimisation-longue",
      severity: "info",
      text: `En optimisation depuis ${ageWeeks} semaines, la phase Performance peut avoir du sens si le client vise une échéance ou des résultats maximaux.`,
    });
  }

  return s;
}
