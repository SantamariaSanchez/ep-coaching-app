// Contenu des lead magnets publics (page /ressources). Vivait avant en dur
// dans ce fichier (array LEAD_MAGNETS, comme lib/mindset-content.ts) ; migré
// vers la table Supabase lead_magnets (voir supabase/migrations/
// 20260814g_lead_magnets_table.sql) pour deux raisons : (1) au-delà de
// quelques dizaines d'entrées un tableau codé en dur alourdit le bundle JS
// et interdit toute recherche/filtre/pagination côté serveur ; (2) la
// production continue de contenu se fait désormais aussi par une routine
// cloud qui n'a accès qu'à Supabase/PubMed en MCP (pas au dépôt git), donc
// ne peut structurellement pas écrire dans un fichier .ts. Les types
// exportés restent identiques à l'ancienne version pour que les composants
// consommateurs n'aient presque rien à changer — seul l'ajout d'un `await`
// aux call sites était nécessaire.
// La capture email/téléphone reste inchangée (table leads, voir
// app/ressources/actions.ts).

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase-admin";
import type { ResourceCategory } from "@/lib/resource-categories";

export type LeadMagnetFormat = "guide" | "checklist" | "quiz";

interface LeadMagnetBase {
  slug: string;
  title: string;
  hook: string;
  category: ResourceCategory;
  subcategory: string | null;
  format: LeadMagnetFormat;
  readTime: string;
  icon: string;
  // Code à 3 chiffres (voir supabase/migrations/20260814h_lead_magnets_
  // keyword.sql), attribué une fois pour toutes et jamais réattribué : le
  // coach le met dans le CTA de ses reels ("tape 076 dans la recherche"),
  // donc une fois publié il doit rester valable indéfiniment.
  keyword: string;
  // true pour le catalogue officiel du fondateur (coach_id vide), false pour
  // un lead magnet écrit par un coach tiers. Rempli seulement par la version
  // complète (page de détail, pour créditer le bon auteur dans le JSON-LD) :
  // la version liste reste légère. Un booléen et jamais le coach_id lui-même :
  // l'objet complet part tel quel dans LeadMagnetLanding ("use client"),
  // donc dans le HTML de la page publique, et l'identifiant du compte d'un
  // coach n'a rien à y faire.
  isOfficial?: boolean;
}

export interface GuideSection {
  heading: string;
  paragraphs: string[];
  // Étapes d'action concrètes et numérotées (demande explicite du
  // 2026-08-15 : "pas juste du texte, mais des vraies choses à appliquer
  // concrètement") — ce qui distingue un vrai lead magnet ("voilà quoi
  // faire, dans l'ordre") d'un simple article de blog ("voilà ce qu'on
  // sait"). Optionnel pour rester rétrocompatible avec les entrées déjà
  // publiées, mais attendu sur au moins une section de chaque nouveau
  // guide — voir LEADMAGNETS.md.
  actionSteps?: string[];
  // Encart à retenir (chiffre clé, seuil, règle simple) mis en avant
  // visuellement plutôt que noyé dans un paragraphe — un repère qu'on
  // retient même en lecture en diagonale.
  callout?: string;
}

export interface GuideMagnet extends LeadMagnetBase {
  format: "guide";
  intro: string;
  sections: GuideSection[];
  conclusion: string;
}

export interface ChecklistGroup {
  heading?: string;
  items: string[];
}

export interface ChecklistMagnet extends LeadMagnetBase {
  format: "checklist";
  intro: string;
  groups: ChecklistGroup[];
  conclusion: string;
}

export interface QuizOption {
  label: string;
  resultKey: string;
}

export interface QuizQuestion {
  question: string;
  options: QuizOption[];
}

export interface QuizOutcome {
  key: string;
  title: string;
  description: string;
}

export interface QuizMagnet extends LeadMagnetBase {
  format: "quiz";
  intro: string;
  questions: QuizQuestion[];
  outcomes: QuizOutcome[];
}

export type LeadMagnet = GuideMagnet | ChecklistMagnet | QuizMagnet;

// Version "carte/liste" sans le contenu (intro/sections/groups/questions...)
// — audit egress 2026-09-16 (quota Supabase gratuit dépassé avec ~14
// comptes) : la quasi-totalité des écrans qui listent les lead magnets
// (page publique /ressources, onglets dashboard coach/client, page admin
// leads) n'affichent que titre/accroche/catégorie/format pour filtrer et
// naviguer vers le détail — jamais le texte complet. Seuls le générateur de
// prompts du Studio (guides entiers) et la page de détail /ressources/[slug]
// ont réellement besoin du contenu. À l'échelle visée de ~1000 lead
// magnets, retélécharger `content` (potentiellement plusieurs Ko de texte
// chacun) pour CHAQUE entrée juste pour afficher une liste de cartes est le
// genre de sur-fetch qui épuise un quota gratuit sans que le trafic ne le
// justifie.
export type LeadMagnetSummary = LeadMagnetBase;

// Une source citée (PubMed ou autre littérature scientifique) pour un lead
// magnet — traçabilité de la règle "jamais de décision non vérifiée".
export interface LeadMagnetSource {
  label: string;
  doi: string | null;
  url: string | null;
}

interface LeadMagnetSummaryRow {
  slug: string;
  title: string;
  hook: string;
  category: string;
  subcategory: string | null;
  format: LeadMagnetFormat;
  read_time: string;
  icon: string;
  keyword: string;
}

interface LeadMagnetRow extends LeadMagnetSummaryRow {
  coach_id: string | null;
  content: Record<string, unknown>;
  sources: LeadMagnetSource[] | null;
  created_at: string;
}

function rowToSummary(row: LeadMagnetSummaryRow): LeadMagnetSummary {
  return {
    slug: row.slug,
    title: row.title,
    hook: row.hook,
    category: row.category as ResourceCategory,
    subcategory: row.subcategory,
    format: row.format,
    readTime: row.read_time,
    icon: row.icon,
    keyword: row.keyword,
  };
}

function rowToMagnet(row: LeadMagnetRow): LeadMagnet {
  const base = rowToSummary(row);
  // content contient exactement les champs spécifiques au format (mêmes
  // noms que l'ancien littéral TS : intro/sections/conclusion pour guide,
  // intro/groups/conclusion pour checklist, intro/questions/outcomes pour
  // quiz), voir le script de migration et LEADMAGNETS.md.
  return { ...base, ...row.content, isOfficial: row.coach_id == null } as LeadMagnet;
}

const SELECT_FIELDS_LIST =
  "slug, title, hook, category, subcategory, format, read_time, icon, keyword";
const SELECT_FIELDS_FULL = `${SELECT_FIELDS_LIST}, coach_id, content, sources`;

// Contenu marketing public, pas scopé par coach ni par utilisateur — lu via
// le client admin comme les autres références partagées (gyms, exercices).
// Revalidation 1h : la routine cloud de production ne peut pas appeler
// revalidateTag (pas de contexte Next.js), donc on s'appuie sur le TTL
// plutôt que sur la purge par tag pour que le nouveau contenu apparaisse
// automatiquement.
//
// Cache "liste" (léger, sans `content`/`sources`) : c'est celui que la
// quasi-totalité des écrans doivent utiliser (voir getAllLeadMagnets
// ci-dessous). Séparé du cache "complet" pour que visiter /ressources (page
// la plus visitée, confirmée comme canal d'acquisition organique) ne
// déclenche plus le téléchargement du texte intégral de chaque lead magnet.
const getAllLeadMagnetSummariesCached = unstable_cache(
  async (): Promise<LeadMagnetSummary[]> => {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("lead_magnets")
        .select(SELECT_FIELDS_LIST)
        .eq("published", true)
        .order("created_at", { ascending: false });
      return ((data as unknown as LeadMagnetSummaryRow[]) ?? []).map(rowToSummary);
    } catch {
      return [];
    }
  },
  ["lead-magnets-summaries"],
  { tags: ["lead-magnets"], revalidate: 3600 }
);

// Texte intégral (2026-10-08, chantier vitesse) : l'ancien cache "complet"
// chargeait les ~1000 lead magnets avec leur contenu (plus de 2 Mo de JSON).
// Au delà de 2 Mo, unstable_cache refuse d'enregistrer : chaque page de
// détail, chaque lien suivi du Studio et chaque stat de leads relançait la
// requête entière (1,9 s en moyenne, des milliers d'appels). Désormais on lit
// UNE ligne, mise en cache par slug ou par numéro.
async function fetchOneFull(column: "slug" | "keyword", value: string): Promise<LeadMagnet | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("lead_magnets")
      .select(SELECT_FIELDS_FULL)
      .eq("published", true)
      .eq(column, value)
      .limit(1)
      .maybeSingle();
    return data ? rowToMagnet(data as unknown as LeadMagnetRow) : null;
  } catch {
    return null;
  }
}

const getLeadMagnetBySlugCached = unstable_cache(
  async (slug: string) => fetchOneFull("slug", slug),
  ["lead-magnet-one-v1"],
  { tags: ["lead-magnets"], revalidate: 3600 }
);

const getLeadMagnetByKeywordCached = unstable_cache(
  async (keyword: string) => fetchOneFull("keyword", keyword),
  ["lead-magnet-kw-v1"],
  { tags: ["lead-magnets"], revalidate: 3600 }
);

// Utilisé par tous les écrans de liste (/ressources public, onglets
// Ressources coach/client, page admin Leads) : titre/accroche/catégorie
// suffisent pour filtrer et naviguer vers le détail, jamais le contenu
// complet. Pour le contenu complet, voir getAllGuidesWithContent (Studio)
// et getLeadMagnet/getLeadMagnetByKeyword (détail).
export async function getAllLeadMagnets(): Promise<LeadMagnetSummary[]> {
  return getAllLeadMagnetSummariesCached();
}

// Seul appelant : app/dashboard/coach/studio/page.tsx (générateur de
// prompts de reels à partir du texte intégral des guides publiés). Ne PAS
// remplacer par getAllLeadMagnets() ci-dessus : ça casserait silencieusement
// SocialGenerator (guide.intro/sections/conclusion absents de la version
// liste).
export async function getAllGuidesWithContent(): Promise<GuideMagnet[]> {
  // Appel ponctuel (action du Studio) : trop gros pour le cache, lu à la demande.
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("lead_magnets")
      .select(SELECT_FIELDS_FULL)
      .eq("published", true)
      .eq("format", "guide")
      .order("created_at", { ascending: false });
    return ((data as unknown as LeadMagnetRow[]) ?? []).map(rowToMagnet) as GuideMagnet[];
  } catch {
    return [];
  }
}

export async function getLeadMagnet(slug: string): Promise<LeadMagnet | undefined> {
  return (await getLeadMagnetBySlugCached(slug)) ?? undefined;
}

// Normalise une saisie utilisateur ("76", "076", " 076 ") vers le format
// stocké en base (3 chiffres minimum, zéro-paddé). Un keyword réel peut
// dépasser 3 chiffres une fois la table au delà de 999 lignes (lpad ne
// tronque jamais côté DB), donc on ne pad ici qu'à 3 chiffres minimum et on
// laisse une saisie plus longue passer telle quelle.
export function normalizeKeyword(raw: string): string | null {
  const digits = raw.trim();
  if (!/^\d+$/.test(digits)) return null;
  return digits.padStart(3, "0");
}

export async function getLeadMagnetByKeyword(raw: string): Promise<LeadMagnet | undefined> {
  const keyword = normalizeKeyword(raw);
  if (!keyword) return undefined;
  return (await getLeadMagnetByKeywordCached(keyword)) ?? undefined;
}

// Accepte aussi les keywords non numériques (UUID des quiz/checklists créés
// hors du catalogue numéroté 001-999).
export async function getLeadMagnetByAnyKeyword(raw: string): Promise<LeadMagnet | undefined> {
  const normalized = normalizeKeyword(raw);
  return (await getLeadMagnetByKeywordCached(normalized ?? raw)) ?? undefined;
}

// Numéro → slug, depuis la liste légère déjà en cache (aucune requête en
// plus) : c'est tout ce dont ont besoin les liens suivis et les stats.
export async function getLeadMagnetSlugByAnyKeyword(raw: string): Promise<string | null> {
  const all = await getAllLeadMagnetSummariesCached();
  const normalized = normalizeKeyword(raw);
  return all.find((m) => m.keyword === raw || (normalized !== null && m.keyword === normalized))?.slug ?? null;
}

// Extrait chaque token "lead_magnets:<keyword>" d'une source_reference de
// coach_scripts (ex: "lead_magnets:131 guide-x (Auteur et al. 2026)" ou
// "lead_magnets:072f644f-... slug + science_articles:... (...)") — ignore
// volontairement les références science_articles, qui ne correspondent à
// aucune ligne lead_magnets/leads.
export function extractLeadMagnetKeywords(sourceReference: string | null | undefined): string[] {
  if (!sourceReference) return [];
  return [...sourceReference.matchAll(/lead_magnets:(\S+)/g)].map((m) => m[1]);
}

export async function getLeadMagnetsByCategory(): Promise<Record<ResourceCategory, LeadMagnetSummary[]>> {
  const all = await getAllLeadMagnetSummariesCached();
  const map = {} as Record<ResourceCategory, LeadMagnetSummary[]>;
  for (const m of all) {
    if (!map[m.category]) map[m.category] = [];
    map[m.category].push(m);
  }
  return map;
}

// Juste les slugs — utilisé par generateStaticParams, pas besoin du cache
// "complet" pour ça.
export async function getLeadMagnetSlugs(): Promise<string[]> {
  const all = await getAllLeadMagnetSummariesCached();
  return all.map((m) => m.slug);
}

export interface LeadMagnetSearchParams {
  query?: string;
  category?: ResourceCategory;
  subcategory?: string;
  format?: LeadMagnetFormat;
  limit?: number;
  offset?: number;
}

export interface LeadMagnetSearchResult {
  items: LeadMagnetSummary[];
  total: number;
}

// Lead magnets ajoutés par CE coach lui-même (coach_id non NULL), distincts
// du catalogue officiel (coach_id NULL, produit par la routine cloud IA) —
// voir 20260902b_lead_magnets_coach_owned.sql. Liste courte et propre à un
// coach, consultée uniquement depuis son propre dashboard (voir
// CoachLeadMagnetManager.tsx) : pas de unstable_cache ici, inutile pour un
// aussi petit volume et ça éviterait de refléter une suppression instantanée.
export interface CoachLeadMagnet {
  id: string;
  slug: string;
  title: string;
  hook: string;
  category: ResourceCategory;
  format: LeadMagnetFormat;
  keyword: string;
  published: boolean;
  created_at: string;
}

export async function getCoachLeadMagnets(coachId: string): Promise<CoachLeadMagnet[]> {
  if (!coachId) return [];
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("lead_magnets")
      .select("id, slug, title, hook, category, format, keyword, published, created_at")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false });
    return (data as CoachLeadMagnet[]) ?? [];
  } catch {
    return [];
  }
}

// Recherche/filtre côté serveur (utilisée par la palette de commande, voir
// app/api/library-search/route.ts, qui n'affiche que slug+titre) : pas de
// cache ici (dépend d'une saisie utilisateur arbitraire), la recherche plein
// texte Postgres (colonne search_text, config 'french') est largement assez
// rapide à l'échelle visée. SELECT_FIELDS_LIST (pas FULL) : appelée
// potentiellement à chaque frappe, `content`/`sources` n'y sont jamais
// affichés.
export async function searchLeadMagnets(params: LeadMagnetSearchParams): Promise<LeadMagnetSearchResult> {
  try {
    const supabase = createAdminClient();
    const limit = params.limit ?? 24;
    const offset = params.offset ?? 0;
    let q = supabase
      .from("lead_magnets")
      .select(SELECT_FIELDS_LIST, { count: "exact" })
      .eq("published", true);

    if (params.query?.trim()) {
      // websearch_to_tsquery tolère une saisie libre (pas de syntaxe
      // opérateur à connaître côté utilisateur), config 'french' pour les
      // accents/pluriels.
      q = q.textSearch("search_text", params.query.trim(), {
        type: "websearch",
        config: "french",
      });
    }
    if (params.category) q = q.eq("category", params.category);
    if (params.subcategory) q = q.eq("subcategory", params.subcategory);
    if (params.format) q = q.eq("format", params.format);

    const { data, count } = await q
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    return {
      items: ((data as unknown as LeadMagnetSummaryRow[]) ?? []).map(rowToSummary),
      total: count ?? 0,
    };
  } catch {
    return { items: [], total: 0 };
  }
}
