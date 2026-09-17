import { createAdminClient } from "@/lib/supabase-admin";

// Idéation (ex "Idées & brouillons", voir lib/content-ideas.ts pour le
// pipeline idée/brouillon/prêt/publié) — deux ajouts du 2026-08-15 : prise
// de notes libre et swipe file de références externes. Tables distinctes
// de coach_notes (notes de suivi hebdo PAR CLIENT, sans rapport).

export interface IdeationNote {
  id: string;
  coach_id: string;
  title: string;
  body: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export async function getIdeationNotes(coachId: string): Promise<IdeationNote[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("coach_ideation_notes")
      .select("id, coach_id, title, body, pinned, created_at, updated_at")
      .eq("coach_id", coachId)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    return (data as IdeationNote[]) ?? [];
  } catch {
    return [];
  }
}

export const INSPIRATION_PLATFORMS = ["instagram", "youtube", "linkedin", "general"] as const;
export type InspirationPlatform = (typeof INSPIRATION_PLATFORMS)[number];

export interface Inspiration {
  id: string;
  coach_id: string;
  url: string;
  platform: InspirationPlatform;
  note: string | null;
  created_at: string;
}

export async function getInspirations(coachId: string): Promise<Inspiration[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("coach_inspirations")
      .select("id, coach_id, url, platform, note, created_at")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false });
    return (data as Inspiration[]) ?? [];
  } catch {
    return [];
  }
}

export const SCRIPT_FORMATS = ["court", "long"] as const;
export type ScriptFormat = (typeof SCRIPT_FORMATS)[number];

// Cycle de vie d'un script (retour direct 2026-09-01, remplace le suivi
// manuel "mis en à tourner" qui vivait jusque-là dans Notion) : Notion reste
// le cerveau/la source de matière première, l'app est l'espace de travail
// où un script se produit puis se suit jusqu'au tournage.
export const SCRIPT_STATUSES = ["a_tourner", "tourne", "publie"] as const;
export type ScriptStatus = (typeof SCRIPT_STATUSES)[number];

export interface CoachScript {
  id: string;
  coach_id: string;
  title: string;
  format: ScriptFormat;
  content: string | null;
  created_at: string;
  updated_at: string;
  // Données enrichies (2026-09-01) : au-delà du seul texte parlé, ce qui
  // rend un script réellement utilisable pour tourner et publier.
  duration_seconds: number | null;
  hook: string | null;
  pillar: string | null;
  source_reference: string | null;
  // CTA PARLÉ à la caméra (distinct de instagram_caption ci-dessous), doit
  // citer le même numéro de leadmagnet que source_reference.
  cta: string | null;
  // Description Instagram à poster avec le reel — retour direct 2026-09-02,
  // structure 3 blocs (voir Notion Guide rédaction description Instagram) :
  // ouverture "Abonne toi à @santamariasanchez_ et COMMENTE [numéro]", corps
  // en "je" (confession/coût/déclic), fermeture "Commente [numéro] si...".
  instagram_caption: string | null;
  platform: string;
  status: ScriptStatus;
  // Tracking de performance (2026-09-10, retour direct : "quasi 0
  // tracking de data pour savoir réitérer") — loggé à la main par le
  // coach une fois le script publié, jamais rempli automatiquement (pas
  // d'accès direct aux stats Instagram/YouTube depuis l'app). `views`
  // seul suffit à calculer "au-dessus de la moyenne" ; likes/commentaires
  // restent optionnels, pour ne pas transformer un log en corvée.
  views: number | null;
  likes: number | null;
  comments_count: number | null;
  // Ajoutés le 2026-09-17 (retour direct : "like et comment et partage et
  // save") — les partages et enregistrements comptent souvent plus que les
  // likes pour l'algorithme (signal d'intérêt réel), migration
  // 20260917d_coach_scripts_shares_saves. Optionnels comme likes/comments,
  // même logique de friction minimale au logging.
  shares: number | null;
  saves: number | null;
}

export async function getCoachScripts(coachId: string): Promise<CoachScript[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("coach_scripts")
      .select("id, coach_id, title, format, content, created_at, updated_at, duration_seconds, hook, pillar, source_reference, cta, instagram_caption, platform, status, views, likes, comments_count, shares, saves")
      .eq("coach_id", coachId)
      .order("updated_at", { ascending: false });
    return (data as CoachScript[]) ?? [];
  } catch {
    return [];
  }
}
