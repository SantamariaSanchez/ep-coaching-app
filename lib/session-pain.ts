// Douleur pendant un exercice (chantier C63, 2026-11-15). Textes affichés au
// pratiquant quand il touche « J'ai mal » en séance. Ils suivent la règle
// Douleur de lib/coaching-knowledge.ts : aucun diagnostic, jamais « force »,
// pas de remplacement automatique, orientation vers un professionnel de santé
// ou les urgences devant un signe grave. Aucune date de reprise ni charge.

/** Signes qui imposent d'arrêter tout de suite et de consulter. */
export const PAIN_RED_FLAGS =
  "Douleur dans la poitrine, malaise, essoufflement anormal, perte de force ou de sensation, ou douleur très forte et soudaine : arrête la séance maintenant et appelle un médecin ou le 15 (112 depuis un portable).";

/** Ce qu'on dit pour une douleur sans signe grave. */
export const PAIN_GUIDANCE =
  "Une douleur qui augmente, qui dure ou qui change ta façon de bouger n'est pas une courbature : ne force pas. Arrête cet exercice pour aujourd'hui ; ton coach décidera de la suite, et si elle persiste, parles-en à un professionnel de santé.";

/** Note ajoutée à l'exercice, visible par le coach dans l'historique de séance. */
export const PAIN_NOTE = "⚠️ Gêne ou douleur signalée pendant cet exercice.";
