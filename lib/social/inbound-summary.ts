export interface InboundDemand {
  prequalifications: number;
  coachSignups: number;
  /** Coachs (hors fondateur) ayant terminé l'onboarding, et total de comptes coach. */
  coachesOnboarded?: number;
  coachesTotal?: number;
}

/** Une phrase simple : jamais de taux de conversion inventé, juste ce qui est arrivé. */
export function inboundSummary(d: InboundDemand): string {
  const parts: string[] = [];
  if (d.prequalifications > 0) parts.push(`${d.prequalifications} ${d.prequalifications > 1 ? "questionnaires remplis" : "questionnaire rempli"}`);
  if (d.coachSignups > 0) parts.push(`${d.coachSignups} ${d.coachSignups > 1 ? "coachs inscrits" : "coach inscrit"}`);
  const activation =
    d.coachesTotal && d.coachesTotal > 0 ? ` Coachs qui ont terminé l'onboarding : ${d.coachesOnboarded ?? 0} sur ${d.coachesTotal}.` : "";
  if (parts.length === 0) return `Aucune demande reçue sur 30 jours : les vues seules ne prouvent rien, regarde quel contenu ouvre une conversation.${activation}`;
  return `Sur 30 jours : ${parts.join(" et ")}.${activation}`;
}
