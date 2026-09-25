// Historique des étapes d'un enregistrement staff_records, partagé entre les
// actions manuelles (app/equipe/actions.ts) et les automatisations
// (lib/staff-automation.ts) : une vente closée par un paiement Stripe doit
// compter exactement comme une vente closée à la main.

import type { RecordKind } from "@/lib/staff-roles";

type EditableKind = Exclude<RecordKind, "report">;

// Parcours linéaires : entrer dans une étape implique d'être passé par les
// précédentes (un lead créé directement en "RDV booké" a forcément été
// qualifié). Les étapes de sortie (perdu, refusé...) n'en font pas partie.
export const FUNNELS: Partial<Record<EditableKind, string[]>> = {
  lead: ["nouveau", "contacte", "qualifie", "rdv_booke", "show", "close"],
  deliverable: ["idee", "en_cours", "relecture", "livre", "publie"],
  candidate: ["candidature", "entretien", "test", "offre", "embauche"],
  feature: ["idee", "specifie", "en_dev", "en_test", "livre"],
  followup: ["j0", "j7", "j30", "actif_j30"],
  opportunity: ["idee", "contacte", "discussion", "confirme", "publie"],
};

export function parisToday(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
}

/** Position dans le parcours, -1 si l'étape n'en fait pas partie (sortie). */
export function funnelRank(kind: EditableKind, status: string): number {
  return FUNNELS[kind]?.indexOf(status) ?? -1;
}

// Complète data._stages (date d'entrée dans chaque étape) et les champs
// internes qui en dépendent. Ne touche jamais aux autres clés de data.
export function applyStageHistory(
  kind: EditableKind,
  status: string,
  data: Record<string, unknown>,
  occurredOn: string | null
): { data: Record<string, unknown>; occurred_on: string | null } {
  const today = parisToday();
  const stages = { ...((data._stages as Record<string, string> | undefined) ?? {}) };
  if (!stages[status]) stages[status] = today;
  const funnel = FUNNELS[kind];
  const position = funnel?.indexOf(status) ?? -1;
  if (funnel && position > 0) {
    for (const earlier of funnel.slice(0, position)) if (!stages[earlier]) stages[earlier] = stages[status];
  }

  const next: Record<string, unknown> = { ...data, _stages: stages };
  if (kind === "ticket") {
    if (status === "resolu") next._resolved_at = (data._resolved_at as string | undefined) ?? new Date().toISOString();
    else delete next._resolved_at;
  }

  let occurred = occurredOn;
  if (!occurred && ((kind === "lead" && status === "close") || (kind === "audit" && status === "fait"))) occurred = today;
  return { data: next, occurred_on: occurred };
}
