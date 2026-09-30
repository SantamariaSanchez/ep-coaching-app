import { createAdminClient } from "@/lib/supabase-admin";
import { extractLeadMagnetKeywords, getLeadMagnetByAnyKeyword } from "@/lib/lead-magnets";
import type { CoachScript } from "@/lib/coach-ideation";
import { LEAD_ORIGIN_PLATFORMS } from "@/lib/lead-origin";

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

/** Lien suivi par script (numéro → slug) et leads réellement amenés par ce lien. */
export interface LeadTracking {
  slugByScriptId: Record<string, string>;
  trackedByScriptId: Record<string, SlugLeadCounts>;
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

// ── Origine des leads en un écran (LANCEMENT.md semaine 2) ─────────────
// Contrairement au comptage par numéro ci-dessus, `leads.origin_script_id`
// vient du lien suivi copié depuis le script (voir lib/lead-origin.ts) :
// là, et seulement là, un lead est vraiment attribuable à UN contenu.

export interface LeadOriginRow {
  id: string;
  lead_magnet_slug: string;
  created_at: string;
  status: string;
  origin_platform: string | null;
  origin_script_id: string | null;
}

export interface LeadOriginReport {
  byPlatform: { platform: string; label: string; total: number; last30Days: number }[];
  byContent: { scriptId: string; title: string; platform: string | null; total: number; last30Days: number; converted: number }[];
  /** Leads sans lien suivi, regroupés par numéro, avec les scripts qui citent ce numéro (piste, jamais une attribution). */
  untracked: { slug: string; total: number; candidateScripts: { id: string; title: string; platform: string | null }[] }[];
  untrackedTotal: number;
  /** Libellé lisible par lead (pour la liste et l'export). */
  labelById: Record<string, string>;
}

export async function getLeadOriginReport(leads: LeadOriginRow[]): Promise<LeadOriginReport> {
  const labels = LEAD_ORIGIN_PLATFORMS as Record<string, string>;
  const admin = createAdminClient();
  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const recent = (iso: string) => now - new Date(iso).getTime() < THIRTY_DAYS_MS;

  const scriptIds = [...new Set(leads.map((l) => l.origin_script_id).filter((id): id is string => !!id))];
  const { data: scriptRows } = scriptIds.length
    ? await admin.from("coach_scripts").select("id, title, platform").in("id", scriptIds)
    : { data: [] };
  const scriptById = new Map(((scriptRows ?? []) as { id: string; title: string; platform: string | null }[]).map((s) => [s.id, s]));

  const platformMap = new Map<string, { total: number; last30Days: number }>();
  const contentMap = new Map<string, { total: number; last30Days: number; converted: number }>();
  const untrackedMap = new Map<string, number>();
  const labelById: Record<string, string> = {};
  let untrackedTotal = 0;

  for (const l of leads) {
    const p = l.origin_platform ?? "inconnue";
    const pe = platformMap.get(p) ?? { total: 0, last30Days: 0 };
    pe.total += 1;
    if (recent(l.created_at)) pe.last30Days += 1;
    platformMap.set(p, pe);

    const platformLabel = l.origin_platform ? labels[l.origin_platform] ?? l.origin_platform : null;
    const script = l.origin_script_id ? scriptById.get(l.origin_script_id) : undefined;
    if (script) {
      const ce = contentMap.get(script.id) ?? { total: 0, last30Days: 0, converted: 0 };
      ce.total += 1;
      if (recent(l.created_at)) ce.last30Days += 1;
      if (l.status === "converti") ce.converted += 1;
      contentMap.set(script.id, ce);
      labelById[l.id] = platformLabel ? `${platformLabel} · ${script.title}` : script.title;
    } else {
      untrackedTotal += 1;
      untrackedMap.set(l.lead_magnet_slug, (untrackedMap.get(l.lead_magnet_slug) ?? 0) + 1);
      if (platformLabel) labelById[l.id] = platformLabel;
    }
  }

  // Pistes pour les leads non suivis : scripts dont le CTA cite ce numéro.
  const topUntracked = [...untrackedMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const candidatesBySlug = new Map<string, { id: string; title: string; platform: string | null }[]>();
  if (topUntracked.length) {
    const { data: citing } = await admin
      .from("coach_scripts")
      .select("id, title, platform, source_reference")
      .like("source_reference", "%lead_magnets:%")
      .order("updated_at", { ascending: false })
      .limit(500);
    const wanted = new Set(topUntracked.map(([slug]) => slug));
    const slugCache = new Map<string, string | null>();
    for (const sc of (citing ?? []) as { id: string; title: string; platform: string | null; source_reference: string | null }[]) {
      for (const keyword of extractLeadMagnetKeywords(sc.source_reference)) {
        if (!slugCache.has(keyword)) slugCache.set(keyword, (await getLeadMagnetByAnyKeyword(keyword))?.slug ?? null);
        const slug = slugCache.get(keyword);
        if (!slug || !wanted.has(slug)) continue;
        const list = candidatesBySlug.get(slug) ?? [];
        if (list.length < 3 && !list.some((x) => x.id === sc.id)) list.push({ id: sc.id, title: sc.title, platform: sc.platform });
        candidatesBySlug.set(slug, list);
      }
    }
  }

  return {
    byPlatform: [...platformMap.entries()]
      .map(([platform, v]) => ({ platform, label: platform === "inconnue" ? "Origine inconnue" : labels[platform] ?? platform, ...v }))
      .sort((a, b) => (a.platform === "inconnue" ? 1 : b.platform === "inconnue" ? -1 : b.total - a.total)),
    byContent: [...contentMap.entries()]
      .map(([scriptId, v]) => {
        const s = scriptById.get(scriptId)!;
        return { scriptId, title: s.title, platform: s.platform, ...v };
      })
      .sort((a, b) => b.total - a.total || b.last30Days - a.last30Days),
    untracked: topUntracked.map(([slug, total]) => ({ slug, total, candidateScripts: candidatesBySlug.get(slug) ?? [] })),
    untrackedTotal,
    labelById,
  };
}

// Numéro de leadmagnet → slug pour chaque script, pour construire son lien
// suivi (premier numéro cité qui existe vraiment).
export async function getLeadMagnetSlugByScriptId(scripts: CoachScript[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const cache = new Map<string, string | null>();
  for (const script of scripts) {
    for (const keyword of extractLeadMagnetKeywords(script.source_reference)) {
      if (!cache.has(keyword)) cache.set(keyword, (await getLeadMagnetByAnyKeyword(keyword))?.slug ?? null);
      const slug = cache.get(keyword);
      if (slug) {
        out[script.id] = slug;
        break;
      }
    }
  }
  return out;
}

// Leads réellement amenés par le lien suivi de chaque script (attribution exacte).
export async function getTrackedLeadsByScriptId(scriptIds: string[]): Promise<Record<string, SlugLeadCounts>> {
  if (scriptIds.length === 0) return {};
  const admin = createAdminClient();
  const { data } = await admin.from("leads").select("origin_script_id, created_at").in("origin_script_id", scriptIds);
  const now = Date.now();
  const out: Record<string, SlugLeadCounts> = {};
  for (const row of (data ?? []) as { origin_script_id: string; created_at: string }[]) {
    const e = (out[row.origin_script_id] ??= { total: 0, last30Days: 0 });
    e.total += 1;
    if (now - new Date(row.created_at).getTime() < 30 * 24 * 60 * 60 * 1000) e.last30Days += 1;
  }
  return out;
}
