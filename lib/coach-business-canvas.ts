import { createAdminClient } from "@/lib/supabase-admin";

// Modèle économique du coach (Business Model Canvas, 9 blocs classiques) —
// Axe 6, passe "masterclass" 2026-09-09. Une ligne par coach (clé primaire
// coach_id), chaque bloc est un texte libre indépendant.

export interface BusinessCanvas {
  coach_id: string;
  value_proposition: string | null;
  customer_segments: string | null;
  channels: string | null;
  customer_relationships: string | null;
  revenue_streams: string | null;
  key_resources: string | null;
  key_activities: string | null;
  key_partners: string | null;
  cost_structure: string | null;
  updated_at: string;
}

export type CanvasBlockKey = Exclude<keyof BusinessCanvas, "coach_id" | "updated_at">;

export interface CanvasBlockInfo {
  key: CanvasBlockKey;
  label: string;
  prompt: string;
}

// Ordre de lecture classique du Business Model Canvas (Osterwalder),
// adapté au vocabulaire d'un coach individuel plutôt qu'à une entreprise
// générique — chaque "prompt" est une vraie question, pas un intitulé sec.
export const CANVAS_BLOCKS: CanvasBlockInfo[] = [
  {
    key: "value_proposition",
    label: "Proposition de valeur",
    prompt: "Quel problème précis tu résous, et pourquoi quelqu'un te choisirait toi plutôt qu'un autre coach ?",
  },
  {
    key: "customer_segments",
    label: "Segments de clientèle",
    prompt: "Qui sont tes clients idéaux ? Niveau, objectif, budget, mode de vie.",
  },
  {
    key: "channels",
    label: "Canaux",
    prompt: "Par où tes futurs clients te découvrent et te contactent (Instagram, bouche-à-oreille, annuaire /coachs...).",
  },
  {
    key: "customer_relationships",
    label: "Relation client",
    prompt: "Quel type de suivi tu offres (1-to-1, communauté, messages, check-ins) et à quelle fréquence.",
  },
  {
    key: "revenue_streams",
    label: "Sources de revenus",
    prompt: "Comment tu es payé : abonnement, forfait, coaching ponctuel, formations...",
  },
  {
    key: "key_resources",
    label: "Ressources clés",
    prompt: "Ce dont tu as besoin pour livrer ton offre : ton temps, la plateforme, ton contenu, ton réseau.",
  },
  {
    key: "key_activities",
    label: "Activités clés",
    prompt: "Ce que tu dois faire chaque semaine pour que le business tourne (créer du contenu, coacher, prospecter).",
  },
  {
    key: "key_partners",
    label: "Partenaires clés",
    prompt: "Qui t'aide à grandir sans faire partie de ton équipe : influenceurs, salles, autres coachs, fournisseurs.",
  },
  {
    key: "cost_structure",
    label: "Structure de coûts",
    prompt: "Tes charges régulières : outils, pub, déplacement, matériel.",
  },
];

export async function getBusinessCanvas(coachId: string): Promise<BusinessCanvas | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("coach_business_canvas")
      .select("coach_id, value_proposition, customer_segments, channels, customer_relationships, revenue_streams, key_resources, key_activities, key_partners, cost_structure, updated_at")
      .eq("coach_id", coachId)
      .maybeSingle();
    return (data as BusinessCanvas) ?? null;
  } catch {
    return null;
  }
}
