import { cache } from "react";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCoachTier } from "@/lib/coach-tier";
import { hasBrand, normalizeHex, type CoachBrand } from "@/lib/coach-branding";

/**
 * Marque d'un coach, seulement s'il est en Premium et en a réglé une.
 * Le fondateur garde l'identité EP Coaching : sa marque n'est jamais lue ici.
 */
export const getCoachBrand = cache(async function getCoachBrand(coachId: string | null | undefined): Promise<CoachBrand | null> {
  if (!coachId) return null;
  try {
    const { data } = await createAdminClient().from("profiles").select("brand_name, brand_color, brand_logo_url, is_platform_owner").eq("id", coachId).maybeSingle();
    const r = data as { brand_name: string | null; brand_color: string | null; brand_logo_url: string | null; is_platform_owner: boolean | null } | null;
    if (!r || r.is_platform_owner) return null;
    if ((await getCoachTier(coachId)) !== "premium") return null;
    const brand = { name: r.brand_name, color: normalizeHex(r.brand_color), logoUrl: r.brand_logo_url };
    return hasBrand(brand) ? brand : null;
  } catch {
    return null;
  }
});
