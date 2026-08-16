"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { slugify, isValidSlug } from "@/lib/campaign-pages";
import { revalidatePath } from "next/cache";

const LIMITS = { headline: 120, subheadline: 200, ctaLabel: 40 };

function cleanText(raw: unknown, max: number): string {
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

// Un lien relatif interne uniquement (jamais un domaine externe arbitraire) :
// le CTA reste sous contrôle de l'app, pas un vecteur de redirection ouverte
// si un jour ce champ devient partagé/affiché ailleurs.
function isSafeInternalPath(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

export interface CreateCampaignPageInput {
  slugHint: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaHref: string;
}

export async function createCampaignPage(
  input: CreateCampaignPageInput
): Promise<{ error?: string; slug?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const headline = cleanText(input.headline, LIMITS.headline);
  const subheadline = cleanText(input.subheadline, LIMITS.subheadline);
  const ctaLabel = cleanText(input.ctaLabel, LIMITS.ctaLabel) || "Rejoindre gratuitement";
  const ctaHref = cleanText(input.ctaHref, 200) || "/auth/client";

  if (!headline) return { error: "Le titre est requis." };
  if (!isSafeInternalPath(ctaHref)) return { error: "Le lien du bouton doit être un chemin interne (commence par /)." };

  const slug = slugify(cleanText(input.slugHint, 60) || headline);
  if (!isValidSlug(slug)) {
    return { error: "Impossible de générer une URL valide à partir de ce titre, précise un identifiant." };
  }

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.from("campaign_pages").insert({
      owner_id: guard.userId,
      slug,
      headline,
      subheadline: subheadline || null,
      cta_label: ctaLabel,
      cta_href: ctaHref,
    });
    if (error) {
      if (error.code === "23505") return { error: "Cette URL existe déjà, choisis un autre identifiant." };
      console.error("createCampaignPage error:", error);
      return { error: "Erreur lors de la création." };
    }
    revalidatePath("/dashboard/coach/studio");
    return { slug };
  } catch (e) {
    console.error("createCampaignPage error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function toggleCampaignPage(id: string, isActive: boolean): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("campaign_pages")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("owner_id", guard.userId);
    if (error) return { error: "Erreur lors de la mise à jour." };
    revalidatePath("/dashboard/coach/studio");
    return {};
  } catch (e) {
    console.error("toggleCampaignPage error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function deleteCampaignPage(id: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.from("campaign_pages").delete().eq("id", id).eq("owner_id", guard.userId);
    if (error) return { error: "Erreur lors de la suppression." };
    revalidatePath("/dashboard/coach/studio");
    return {};
  } catch (e) {
    console.error("deleteCampaignPage error:", e);
    return { error: "Erreur inattendue." };
  }
}
