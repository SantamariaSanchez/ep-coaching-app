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

// Une source citée (PubMed ou autre littérature scientifique) pour un lead
// magnet — traçabilité de la règle "jamais de décision non vérifiée".
export interface LeadMagnetSource {
  label: string;
  doi: string | null;
  url: string | null;
}

interface LeadMagnetRow {
  slug: string;
  title: string;
  hook: string;
  category: string;
  subcategory: string | null;
  format: LeadMagnetFormat;
  read_time: string;
  icon: string;
  keyword: string;
  content: Record<string, unknown>;
  sources: LeadMagnetSource[] | null;
  created_at: string;
}

function rowToMagnet(row: LeadMagnetRow): LeadMagnet {
  const base = {
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
  // content contient exactement les champs spécifiques au format (mêmes
  // noms que l'ancien littéral TS : intro/sections/conclusion pour guide,
  // intro/groups/conclusion pour checklist, intro/questions/outcomes pour
  // quiz), voir le script de migration et LEADMAGNETS.md.
  return { ...base, ...row.content } as LeadMagnet;
}

const SELECT_FIELDS =
  "slug, title, hook, category, subcategory, format, read_time, icon, keyword, content, sources, created_at";

// Contenu marketing public, pas scopé par coach ni par utilisateur — lu via
// le client admin comme les autres références partagées (gyms, exercices).
// Revalidation 1h : la routine cloud de production ne peut pas appeler
// revalidateTag (pas de contexte Next.js), donc on s'appuie sur le TTL
// plutôt que sur la purge par tag pour que le nouveau contenu apparaisse
// automatiquement.
const getAllLeadMagnetsCached = unstable_cache(
  async (): Promise<LeadMagnet[]> => {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("lead_magnets")
        .select(SELECT_FIELDS)
        .eq("published", true)
        .order("created_at", { ascending: false });
      return ((data as unknown as LeadMagnetRow[]) ?? []).map(rowToMagnet);
    } catch {
      return [];
    }
  },
  ["lead-magnets-all"],
  { tags: ["lead-magnets"], revalidate: 3600 }
);

export async function getAllLeadMagnets(): Promise<LeadMagnet[]> {
  return getAllLeadMagnetsCached();
}

export async function getLeadMagnet(slug: string): Promise<LeadMagnet | undefined> {
  const all = await getAllLeadMagnetsCached();
  return all.find((m) => m.slug === slug);
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
  const all = await getAllLeadMagnetsCached();
  return all.find((m) => m.keyword === keyword);
}

export async function getLeadMagnetsByCategory(): Promise<Record<ResourceCategory, LeadMagnet[]>> {
  const all = await getAllLeadMagnetsCached();
  const map = {} as Record<ResourceCategory, LeadMagnet[]>;
  for (const m of all) {
    if (!map[m.category]) map[m.category] = [];
    map[m.category].push(m);
  }
  return map;
}

// Juste les slugs — utilisé par generateStaticParams, pas besoin de
// resélectionner tout le contenu pour ça.
export async function getLeadMagnetSlugs(): Promise<string[]> {
  const all = await getAllLeadMagnetsCached();
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
  items: LeadMagnet[];
  total: number;
}

// Recherche/filtre côté serveur pour l'onglet Ressources : pas de cache ici
// (dépend d'une saisie utilisateur arbitraire), la recherche plein texte
// Postgres (colonne search_text, config 'french') est largement assez
// rapide à l'échelle visée. Utilisée par la nouvelle UX de /ressources.
export async function searchLeadMagnets(params: LeadMagnetSearchParams): Promise<LeadMagnetSearchResult> {
  try {
    const supabase = createAdminClient();
    const limit = params.limit ?? 24;
    const offset = params.offset ?? 0;
    let q = supabase
      .from("lead_magnets")
      .select(SELECT_FIELDS, { count: "exact" })
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
      items: ((data as unknown as LeadMagnetRow[]) ?? []).map(rowToMagnet),
      total: count ?? 0,
    };
  } catch {
    return { items: [], total: 0 };
  }
}
