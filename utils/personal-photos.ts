import { createServerSupabase } from "@/lib/supabase-server";
import { getCachedOrCreateSignedUrl } from "@/utils/signed-url-cache";

const PERSONAL_PHOTOS_BUCKET = "progress-photos";
// Même durée et même raisonnement que utils/photos.ts (chantier egress
// Supabase, MASTERCLASS.md Axe CH) : 24h au lieu de 1h, rendu possible par le
// cache d'URL signée qui garde la même URL tant qu'elle reste valide.
// Invalidation à la suppression : voir deletePersonalPhoto dans
// app/dashboard/client/photos/personal-actions.ts et
// app/dashboard/coach/moi/photos/personal-actions.ts.
const PERSONAL_PHOTOS_SIGNED_URL_TTL = 60 * 60 * 24;

export interface PersonalPhoto {
  id: string;
  client_id: string;
  taken_at: string;
  storage_path: string;
  notes: string | null;
  created_at: string;
  url: string | null;
}

export async function getPersonalPhotos(clientId: string): Promise<PersonalPhoto[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("personal_photos")
      .select("*")
      .eq("client_id", clientId)
      .order("taken_at", { ascending: false })
      .order("created_at", { ascending: false });

    const rows = (data as Omit<PersonalPhoto, "url">[]) ?? [];
    if (rows.length === 0) return [];

    const urls = await Promise.all(
      rows.map((r) =>
        getCachedOrCreateSignedUrl(supabase, PERSONAL_PHOTOS_BUCKET, r.storage_path, PERSONAL_PHOTOS_SIGNED_URL_TTL)
      )
    );

    return rows.map((r, i) => ({ ...r, url: urls[i] ?? null }));
  } catch {
    return [];
  }
}
