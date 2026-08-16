import { createAdminClient } from "@/lib/supabase-admin";

// Landing pages dédiées par campagne, voir
// supabase/migrations/20260816c_campaign_pages.sql.
export interface CampaignPage {
  id: string;
  owner_id: string;
  slug: string;
  headline: string;
  subheadline: string | null;
  cta_label: string;
  cta_href: string;
  view_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getCampaignPagesForOwner(ownerId: string): Promise<CampaignPage[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("campaign_pages")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    return (data as CampaignPage[]) ?? [];
  } catch {
    return [];
  }
}

// Lecture publique (page /c/[slug], visiteur anonyme) : uniquement les
// pages actives, jamais un brouillon désactivé par erreur.
export async function getActiveCampaignPage(slug: string): Promise<CampaignPage | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("campaign_pages")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    return (data as CampaignPage | null) ?? null;
  } catch {
    return null;
  }
}

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    // Retire les diacritiques (accents) une fois décomposés par NFD, ex.
    // "é" → "e" + accent combinant U+0301 isolé, supprimé ici.
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function isValidSlug(slug: string): boolean {
  return slug.length >= 3 && slug.length <= 60 && SLUG_RE.test(slug);
}
