import { createAdminClient } from "@/lib/supabase-admin";
import { extractLeadMagnetKeywords, getLeadMagnetByAnyKeyword } from "@/lib/lead-magnets";
import type { CoachScript } from "@/lib/coach-ideation";

// Chantier "tracking Insider-like" (retour direct 2026-09-17, transcript
// Matis Clouet cité : "qu'est-ce qui convertit, quels réels rapportent le
// plus de cash") : on n'a aucun accès API Instagram/YouTube réel (pas de
// connecteur Meta Partner disponible dans cette session), donc impossible
// de répliquer le tracking automatique du reach/DM/vente d'un vrai outil
// comme Insider. Ce qu'on a en revanche, c'est une vraie donnée interne
// déjà fiable : la table `leads` (capture réelle sur /ressources, un lead
// par email+lead_magnet_slug), qu'on peut relier au numéro de leadmagnet
// que chaque script cite dans son CTA (`source_reference`). Ça donne un
// signal réel de conversion contenu -> lead, sans aucune saisie manuelle,
// à ne jamais confondre avec les vues/likes/commentaires (Studio créatif,
// saisis à la main) qui restent purement déclaratifs.
//
// Limite honnête à garder en tête partout où ce module est utilisé :
// plusieurs scripts différents peuvent citer le même numéro de leadmagnet
// à des dates différentes. Le total de leads sur un numéro n'est donc
// JAMAIS attribuable à un seul script avec certitude, seulement au numéro
// lui-même — c'est pour ça que l'UI doit toujours afficher "leads captés
// sur ce numéro" et jamais "leads générés par CE script".

export interface SlugLeadCounts {
  total: number;
  last30Days: number;
}

// Une seule lecture de toute la table `leads`, groupée par slug — bien
// moins cher qu'une requête par script (un coach a rarement plus de
// quelques centaines de leads au total à ce stade du produit).
export async function getLeadCountsBySlug(): Promise<Record<string, SlugLeadCounts>> {
  const admin = createAdminClient();
  const { data } = await admin.from("leads").select("lead_magnet_slug, created_at");
  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const counts: Record<string, SlugLeadCounts> = {};
  for (const row of data ?? []) {
    const slug = row.lead_magnet_slug as string | null;
    if (!slug) continue;
    if (!counts[slug]) counts[slug] = { total: 0, last30Days: 0 };
    counts[slug].total += 1;
    if (now - new Date(row.created_at as string).getTime() < THIRTY_DAYS_MS) {
      counts[slug].last30Days += 1;
    }
  }
  return counts;
}

// Pour chaque script, résout son/ses numéro(s) de leadmagnet cité(s) dans
// `source_reference` vers un total de vrais leads captés sur ce(s)
// numéro(s) — un seul aller-retour lead_magnets par keyword distinct
// rencontré (mis en cache localement à cet appel, pas de requête dupliquée
// si plusieurs scripts partagent le même numéro).
export async function getRealLeadsByScriptId(
  scripts: CoachScript[]
): Promise<Record<string, SlugLeadCounts>> {
  const leadCountsBySlug = await getLeadCountsBySlug();
  const slugCache = new Map<string, string | null>();

  async function resolveSlug(keyword: string): Promise<string | null> {
    if (slugCache.has(keyword)) return slugCache.get(keyword) ?? null;
    const magnet = await getLeadMagnetByAnyKeyword(keyword);
    const slug = magnet?.slug ?? null;
    slugCache.set(keyword, slug);
    return slug;
  }

  const result: Record<string, SlugLeadCounts> = {};
  for (const script of scripts) {
    const keywords = extractLeadMagnetKeywords(script.source_reference);
    if (keywords.length === 0) continue;
    let total = 0;
    let last30Days = 0;
    for (const keyword of keywords) {
      const slug = await resolveSlug(keyword);
      if (!slug) continue;
      const counts = leadCountsBySlug[slug];
      if (!counts) continue;
      total += counts.total;
      last30Days += counts.last30Days;
    }
    if (total > 0) {
      result[script.id] = { total, last30Days };
    }
  }
  return result;
}
