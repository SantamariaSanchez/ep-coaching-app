import { BREVO_API, brevoHeaders } from "@/lib/brevo-mailing";
import { createAdminClient } from "@/lib/supabase-admin";

// Suivi de performance mailing (2026-09-16) : retour direct de
// l'utilisateur ("travaille encore plus sur le mailing et derrière le
// tracking des données : taux d'ouverture, de clic etc, dans l'appli en
// tant que coach"). Décision : lire les statistiques déjà calculées par
// Brevo via GET /v3/emailCampaigns/{id}?statistics=globalStats (API en
// LECTURE, format vérifié en direct sur le compte Brevo de production le
// 2026-09-16 via le connecteur MCP Brevo) plutôt que de configurer un
// webhook Brevo. Un webhook demanderait de coller une URL publique + un
// secret dans l'interface Brevo — une manipulation que l'utilisateur
// non-développeur ne peut pas fiabiliser seul. Le prix à payer : pas de
// mise à jour automatique, il faut rafraîchir à la demande (voir
// stats_json/stats_fetched_at, mis en cache sur coach_mailings —
// supabase/migrations/20260916b_mailing_stats_cache.sql).
//
// Réponse Brevo confirmée (champ statistics.globalStats), exemple réel :
// { uniqueClicks, clickers, complaints, delivered, sent, softBounces,
//   hardBounces, uniqueViews, unsubscriptions, viewed, trackableViews,
//   trackableViewsRate, estimatedViews, opensRate, appleMppOpens }
// On ne garde que les champs utiles au coach, et on recalcule nous-mêmes
// openRate/clickRate sur la base de "delivered" (plutôt que le opensRate
// déjà renvoyé par Brevo) pour rester cohérent entre affichages et ne pas
// dépendre d'une base de calcul Brevo qui pourrait varier.

export interface CampaignStats {
  sent: number;
  delivered: number;
  uniqueViews: number;
  viewed: number;
  uniqueClicks: number;
  clickers: number;
  unsubscriptions: number;
  hardBounces: number;
  softBounces: number;
  openRate: number; // uniqueViews / delivered, 0..1
  clickRate: number; // uniqueClicks / delivered, 0..1
}

interface BrevoGlobalStats {
  sent?: number;
  delivered?: number;
  uniqueViews?: number;
  viewed?: number;
  uniqueClicks?: number;
  clickers?: number;
  unsubscriptions?: number;
  hardBounces?: number;
  softBounces?: number;
}

interface BrevoCampaignStatsResponse {
  statistics?: { globalStats?: BrevoGlobalStats };
}

// Une campagne trop récente, un id invalide, une clé API absente en local,
// ou un incident Brevo ne doivent jamais casser la page mailing du coach —
// `null` dans tous ces cas, jamais d'exception qui remonte plus haut.
export async function getCampaignStats(campaignId: number): Promise<CampaignStats | null> {
  try {
    const res = await fetch(`${BREVO_API}/emailCampaigns/${campaignId}?statistics=globalStats`, {
      headers: brevoHeaders(),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as BrevoCampaignStatsResponse;
    const g = data.statistics?.globalStats;
    if (!g) return null;

    const sent = g.sent ?? 0;
    const delivered = g.delivered ?? 0;
    const uniqueViews = g.uniqueViews ?? 0;
    const viewed = g.viewed ?? 0;
    const uniqueClicks = g.uniqueClicks ?? 0;
    const clickers = g.clickers ?? 0;
    const unsubscriptions = g.unsubscriptions ?? 0;
    const hardBounces = g.hardBounces ?? 0;
    const softBounces = g.softBounces ?? 0;

    return {
      sent,
      delivered,
      uniqueViews,
      viewed,
      uniqueClicks,
      clickers,
      unsubscriptions,
      hardBounces,
      softBounces,
      openRate: delivered > 0 ? uniqueViews / delivered : 0,
      clickRate: delivered > 0 ? uniqueClicks / delivered : 0,
    };
  } catch {
    return null;
  }
}

// Récupère les stats d'une campagne et les met en cache sur la ligne
// d'historique correspondante (coach_mailings.stats_json/stats_fetched_at),
// pour ne pas refaire l'appel Brevo à chaque rendu de la page. `null` si
// Brevo ne répond pas — la ligne garde alors son ancien cache (jamais
// écrasé par un échec).
export async function refreshMailingStats(mailingId: string, campaignId: number): Promise<CampaignStats | null> {
  const stats = await getCampaignStats(campaignId);
  if (!stats) return null;

  const admin = createAdminClient();
  await admin
    .from("coach_mailings")
    .update({ stats_json: stats, stats_fetched_at: new Date().toISOString() })
    .eq("id", mailingId);

  return stats;
}

export interface MailingToRefresh {
  id: string;
  brevoCampaignId: number;
}

// Rafraîchit plusieurs campagnes d'un coup ("Rafraîchir les stats" sur
// l'historique entier plutôt qu'une par une). Séquentiel volontairement,
// pas Promise.all : même raison que syncClientsToList dans
// lib/brevo-mailing.ts — l'API Brevo limite le débit de requêtes par
// seconde, et l'historique affiché n'a jamais assez d'entrées pour que la
// latence supplémentaire d'un enchaînement séquentiel soit gênante en
// pratique.
export async function refreshManyMailingStats(mailings: MailingToRefresh[]): Promise<{ updated: number; failed: number }> {
  let updated = 0;
  let failed = 0;
  for (const m of mailings) {
    const stats = await refreshMailingStats(m.id, m.brevoCampaignId);
    if (stats) updated++;
    else failed++;
  }
  return { updated, failed };
}
