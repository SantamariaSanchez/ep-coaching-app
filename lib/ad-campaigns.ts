import { createAdminClient } from "@/lib/supabase-admin";
import { todayInParis } from "@/lib/dates";

// Outil de pilotage MANUEL de la pub payante (Google/Meta/TikTok...) —
// voir supabase/migrations/20260916a_ad_campaigns.sql pour le détail des
// choix de schéma. Aucune intégration API régie : le coach saisit/copie
// ses chiffres depuis Google Ads / Meta Ads, l'appli calcule les métriques
// de décision (CPM, CPC, CTR, coût par lead, ROAS).

// Suggestions affichées dans le formulaire — valeur libre acceptée côté
// DB (pas de check, voir migration) et côté action serveur, contrairement
// à content_ideas.platform : une régie qui n'est pas encore dans cette
// liste ne doit jamais bloquer la saisie.
export const AD_PLATFORMS = ["google", "meta", "tiktok", "autre"] as const;
export type AdPlatform = (typeof AD_PLATFORMS)[number];

export const AD_OBJECTIVES = ["leads", "ventes", "notoriete", "autre"] as const;
export type AdObjective = (typeof AD_OBJECTIVES)[number];

export const AD_STATUSES = ["active", "pausee", "terminee"] as const;
export type AdStatus = (typeof AD_STATUSES)[number];

export const PLATFORM_LABELS: Record<string, string> = {
  google: "Google Ads",
  meta: "Meta Ads",
  tiktok: "TikTok Ads",
  autre: "Autre",
};

export const OBJECTIVE_LABELS: Record<string, string> = {
  leads: "Leads",
  ventes: "Ventes",
  notoriete: "Notoriété",
  autre: "Autre",
};

export const STATUS_LABELS: Record<AdStatus, string> = {
  active: "Active",
  pausee: "Pausée",
  terminee: "Terminée",
};

export interface AdCampaign {
  id: string;
  coach_id: string;
  name: string;
  platform: string;
  objective: string;
  status: AdStatus;
  budget_daily: number | null;
  budget_total: number | null;
  spend_total: number;
  impressions: number;
  clicks: number;
  leads: number;
  revenue_generated: number | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  stopped_reason: string | null;
  created_at: string;
  updated_at: string;
}

const SELECT_COLUMNS =
  "id, coach_id, name, platform, objective, status, budget_daily, budget_total, spend_total, impressions, clicks, leads, revenue_generated, start_date, end_date, notes, stopped_reason, created_at, updated_at";

export async function getCoachAdCampaigns(coachId: string): Promise<AdCampaign[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("ad_campaigns")
      .select(SELECT_COLUMNS)
      .eq("coach_id", coachId)
      .order("status", { ascending: true }) // 'active' < 'pausee' < 'terminee' alphabétiquement : actives en premier
      .order("created_at", { ascending: false });
    return (data as AdCampaign[]) ?? [];
  } catch {
    return [];
  }
}

// ── Calculs purs ────────────────────────────────────────────────────────
// Toute la logique de métriques vit ici (testable, réutilisable), jamais
// dispersée dans le JSX du composant.

/** Coût pour mille impressions. null si pas encore d'impressions. */
export function computeCpm(spend: number, impressions: number): number | null {
  if (impressions <= 0) return null;
  return (spend / impressions) * 1000;
}

/** Coût par clic. null si pas encore de clics. */
export function computeCpc(spend: number, clicks: number): number | null {
  if (clicks <= 0) return null;
  return spend / clicks;
}

/** Taux de clic, en pourcentage. null si pas encore d'impressions. */
export function computeCtr(clicks: number, impressions: number): number | null {
  if (impressions <= 0) return null;
  return (clicks / impressions) * 100;
}

/** Coût par lead/conversion. null si pas encore de leads. */
export function computeCostPerLead(spend: number, leads: number): number | null {
  if (leads <= 0) return null;
  return spend / leads;
}

/** Retour sur la dépense pub (revenu généré / dépense). null si dépense nulle ou revenu non déclaré. */
export function computeRoas(spend: number, revenue: number | null): number | null {
  if (revenue === null || spend <= 0) return null;
  return revenue / spend;
}

export interface CampaignMetrics {
  cpm: number | null;
  cpc: number | null;
  ctr: number | null;
  costPerLead: number | null;
  roas: number | null;
}

export function computeCampaignMetrics(campaign: AdCampaign): CampaignMetrics {
  return {
    cpm: computeCpm(campaign.spend_total, campaign.impressions),
    cpc: computeCpc(campaign.spend_total, campaign.clicks),
    ctr: computeCtr(campaign.clicks, campaign.impressions),
    costPerLead: computeCostPerLead(campaign.spend_total, campaign.leads),
    roas: computeRoas(campaign.spend_total, campaign.revenue_generated),
  };
}

/** Nombre de jours écoulés depuis le début de la campagne (start_date, ou created_at si absent). */
export function daysSinceStart(campaign: Pick<AdCampaign, "start_date" | "created_at">, today = todayInParis()): number {
  const startStr = campaign.start_date ?? campaign.created_at.slice(0, 10);
  const start = new Date(startStr + "T00:00:00");
  const now = new Date(today + "T00:00:00");
  const diffMs = now.getTime() - start.getTime();
  return Math.max(0, Math.round(diffMs / 86_400_000));
}

/**
 * Amélioration non demandée explicitement : détecte une campagne active qui
 * dépense depuis plusieurs jours sans avoir généré le moindre lead — le
 * signal le plus utile pour "quoi couper" quand on pilote plusieurs
 * campagnes en même temps et qu'on n'a pas le temps de comparer chaque
 * ligne à la main. Seuil de 3 jours : assez pour ne pas alerter sur une
 * campagne qui vient tout juste d'être lancée (le délai d'apprentissage
 * des régies fait qu'un jour ou deux sans lead est normal).
 */
export function isStagnant(campaign: AdCampaign, today = todayInParis()): boolean {
  if (campaign.status !== "active") return false;
  if (campaign.spend_total <= 0) return false;
  if (campaign.leads > 0) return false;
  return daysSinceStart(campaign, today) >= 3;
}

// ── Sévérité visuelle ────────────────────────────────────────────────────
// Traduit une métrique en "bon / neutre / mauvais / inconnu" pour que le
// composant puisse colorer sans dupliquer les seuils. Gardé ici (pas dans
// le JSX) pour rester testable et cohérent partout où la métrique s'affiche.

export type MetricSeverity = "good" | "neutral" | "bad" | "unknown";

/** CTR jugé sur un échantillon trop petit (<100 impressions) reste "unknown" — pas assez de signal pour juger. */
export function ctrSeverity(ctr: number | null, impressions: number): MetricSeverity {
  if (ctr === null || impressions < 100) return "unknown";
  if (ctr >= 1.5) return "good";
  if (ctr >= 0.5) return "neutral";
  return "bad";
}

/**
 * Le coût par lead n'a pas de seuil absolu universel : ce qui est "bon"
 * dépend entièrement de l'économie du coach (panier moyen, LTV), qu'on ne
 * connaît pas ici. On juge donc chaque campagne RELATIVEMENT à la moyenne
 * des campagnes du même coach — le signal qui compte vraiment pour
 * décider quoi couper/scaler quand on pilote plusieurs campagnes à la fois.
 */
export function costPerLeadSeverity(costPerLead: number | null, avgCostPerLead: number | null): MetricSeverity {
  if (costPerLead === null) return "unknown";
  if (avgCostPerLead === null || avgCostPerLead <= 0) return "neutral";
  const ratio = costPerLead / avgCostPerLead;
  if (ratio <= 0.8) return "good";
  if (ratio <= 1.5) return "neutral";
  return "bad";
}

/** ROAS : 3x et plus est une référence courante de campagne saine, sous 1x elle perd de l'argent. */
export function roasSeverity(roas: number | null): MetricSeverity {
  if (roas === null) return "unknown";
  if (roas >= 3) return "good";
  if (roas >= 1) return "neutral";
  return "bad";
}

export interface CampaignTotals {
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  revenue: number;
  avgCostPerLead: number | null;
  avgCtr: number | null;
  avgRoas: number | null;
}

export function aggregateCampaignTotals(campaigns: AdCampaign[]): CampaignTotals {
  const spend = campaigns.reduce((s, c) => s + c.spend_total, 0);
  const impressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const clicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const leads = campaigns.reduce((s, c) => s + c.leads, 0);
  const revenue = campaigns.reduce((s, c) => s + (c.revenue_generated ?? 0), 0);
  return {
    spend,
    impressions,
    clicks,
    leads,
    revenue,
    avgCostPerLead: computeCostPerLead(spend, leads),
    avgCtr: computeCtr(clicks, impressions),
    avgRoas: computeRoas(spend, revenue > 0 ? revenue : null),
  };
}
