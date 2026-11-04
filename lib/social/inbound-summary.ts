export interface InboundDemand {
  prequalifications: number;
  coachSignups: number;
  /** Coachs (hors fondateur) ayant terminé l'onboarding, et total de comptes coach. */
  coachesOnboarded?: number;
  coachesTotal?: number;
  /** Leads guides gratuits sur 30 jours, et leur origine déclarée (plateforme -> nombre). */
  leads?: number;
  leadsByOrigin?: Record<string, number>;
}

/** Une phrase simple : jamais de taux de conversion inventé, juste ce qui est arrivé. */
export function inboundSummary(d: InboundDemand): string {
  const parts: string[] = [];
  if (d.prequalifications > 0) parts.push(`${d.prequalifications} ${d.prequalifications > 1 ? "questionnaires remplis" : "questionnaire rempli"}`);
  if (d.leads && d.leads > 0) {
    const origins = Object.entries(d.leadsByOrigin ?? {}).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`);
    parts.push(`${d.leads} ${d.leads > 1 ? "leads guides gratuits" : "lead guide gratuit"}${origins.length ? ` (${origins.join(", ")})` : ""}`);
  }
  if (d.coachSignups > 0) parts.push(`${d.coachSignups} ${d.coachSignups > 1 ? "coachs inscrits" : "coach inscrit"}`);
  const activation =
    d.coachesTotal && d.coachesTotal > 0 ? ` Coachs qui ont terminé l'onboarding : ${d.coachesOnboarded ?? 0} sur ${d.coachesTotal}.` : "";
  if (parts.length === 0) return `Aucune demande reçue sur 30 jours : les vues seules ne prouvent rien, regarde quel contenu ouvre une conversation.${activation}`;
  return `Sur 30 jours : ${parts.join(" et ")}.${activation}`;
}
