// Types d'appel de vente, partagés entre le serveur et le tableau de suivi.
export type SalesCallKind = "decouverte" | "kickoff" | "suivi";

export const SALES_CALL_KIND_LABEL: Record<SalesCallKind, string> = {
  decouverte: "Appel découverte",
  kickoff: "Appel kickoff",
  suivi: "Appel de suivi",
};

export const SALES_CALL_KINDS = Object.keys(SALES_CALL_KIND_LABEL) as SalesCallKind[];
