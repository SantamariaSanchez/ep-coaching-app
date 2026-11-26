// Adhésion aux séances (26/11, « je fais pas mes entraînements », processus à
// implémenter pour la personnalisation). Le rappel de 21 h disait la même
// phrase à quelqu'un qui saute une séance et à quelqu'un qui n'en fait plus
// aucune. Ici, on lit ce qui a vraiment été fait sur 14 jours par rapport à ce
// qui était prévu, et on adapte la consigne, sans culpabiliser :
//   - tenu (70 % ou plus) : rien ne change ;
//   - fragile (40 à 69 %) : la version courte quand le temps manque ;
//   - décroché (moins de 40 %) : moins de séances, un objectif tenable
//     (Mastermind : une séance courte vaut mieux qu'une séance sautée, la
//     régularité avant l'optimal). Jamais appliqué sans la personne.
// Fichier pur, testé dans lib/__tests__/training-adherence.test.ts.

export type AdherenceLevel = "tenu" | "fragile" | "decroche" | "inconnu";

export interface TrainingAdherence {
  level: AdherenceLevel;
  /** Part des séances prévues réellement faites sur 14 jours (0 à 1), null si rien n'était prévu. */
  rate: number | null;
  /** Séances par semaine à proposer (seulement si décroché). */
  suggestedPerWeek: number | null;
  /** Phrase du rappel de 21 h, adaptée. */
  reminder: string;
}

export function trainingAdherence(input: { plannedPerWeek: number; done14d: number; weeksSinceStart?: number | null; label?: string }): TrainingAdherence {
  const planned14 = Math.max(0, Math.round(input.plannedPerWeek)) * 2;
  const label = input.label ? `« ${input.label} »` : "ta séance";
  const base = `Tu avais ${label} de prévu aujourd'hui, pense à la valider dans ton logbook si tu l'as faite.`;
  if (planned14 === 0) return { level: "inconnu", rate: null, suggestedPerWeek: null, reminder: base };
  // Les deux premières semaines, on observe : trop tôt pour conclure.
  if ((input.weeksSinceStart ?? 99) < 2) return { level: "inconnu", rate: Math.min(1, input.done14d / planned14), suggestedPerWeek: null, reminder: base };

  const rate = Math.min(1, input.done14d / planned14);
  if (rate >= 0.7) return { level: "tenu", rate, suggestedPerWeek: null, reminder: base };
  if (rate >= 0.4) {
    return {
      level: "fragile",
      rate,
      suggestedPerWeek: null,
      reminder: `${label[0].toUpperCase()}${label.slice(1)} n'est pas encore validée. Pas le temps ? Ouvre-la quand même, menu « Peu de temps ? Adapter la séance » : une séance courte vaut mieux qu'une séance sautée.`,
    };
  }
  const perWeek = Math.max(2, Math.min(input.plannedPerWeek - 1, Math.ceil(input.done14d / 2) + 1));
  return {
    level: "decroche",
    rate,
    suggestedPerWeek: perWeek < input.plannedPerWeek ? perWeek : null,
    reminder:
      perWeek < input.plannedPerWeek
        ? `${input.done14d} séance${input.done14d > 1 ? "s" : ""} sur ${planned14} prévues ces deux dernières semaines. On vise ${perWeek} par semaine pour l'instant, en version courte s'il faut : c'est ce que tu tiens qui te fait progresser.`
        : `${input.done14d} séance${input.done14d > 1 ? "s" : ""} sur ${planned14} prévues ces deux dernières semaines. Demain, juste la version courte : 25 minutes, et la semaine repart.`,
  };
}
