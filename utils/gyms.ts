import { createAdminClient } from "@/lib/supabase-admin";
import { unstable_cache } from "next/cache";
import type { GymType } from "@/lib/gyms-seed";
import type { EquipmentType } from "@/lib/exercise-library-content";

export interface Gym {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  equipment_notes: string | null;
  website: string | null;
  type: GymType | null;
  // Tags structurés (voir migration gyms_equipment_types) — même taxonomie
  // que le classement des exercices, pour un filtre réel et le croisement
  // "exercices réalisables ici" (utils/exercise-library.ts).
  equipment_types: EquipmentType[];
  created_by: string | null;
  created_at: string;
}

export interface GymReview {
  id: string;
  gym_id: string;
  author_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

export interface GymWithReviews extends Gym {
  reviews: GymReview[];
  avgRating: number | null;
}

// Croise le nom de salle en texte libre de la fiche client (gym_name, pas
// relié par clé étrangère à la table gyms) avec l'annuaire communautaire —
// best-effort (correspondance approximative sur le nom), pour donner au
// coach ce que d'autres ont déjà noté sur le matériel de cette salle sans
// avoir à aller le chercher séparément.
export async function findGymEquipmentNotes(gymName: string | null): Promise<string | null> {
  if (!gymName?.trim()) return null;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("gyms")
      .select("equipment_notes")
      .ilike("name", `%${gymName.trim()}%`)
      .not("equipment_notes", "is", null)
      .limit(1)
      .maybeSingle();
    return (data as { equipment_notes: string | null } | null)?.equipment_notes ?? null;
  } catch {
    return null;
  }
}

// 88 salles + leurs avis, référence partagée (pas scopée utilisateur, voir
// commentaire ci-dessous). Mise en cache 1h ; createGym/updateGym/deleteGym/
// seedOfficialGyms/upsertGymReview/deleteGymReview (gyms/actions.ts) purgent
// le tag "gyms" dès qu'une salle ou un avis change.
export const getGymsWithReviews = unstable_cache(
  async (): Promise<GymWithReviews[]> => {
    try {
      // Shared reference content (not user-scoped) — read via the admin client
      // so display never depends on RLS being configured a particular way on
      // these tables.
      const supabase = createAdminClient();
      const [{ data: gyms }, { data: reviews }] = await Promise.all([
        supabase.from("gyms").select("*").order("created_at", { ascending: false }),
        supabase.from("gym_reviews").select("*, profiles(full_name)").order("created_at", { ascending: false }),
      ]);

      const reviewsByGym: Record<string, GymReview[]> = {};
      for (const r of (reviews as GymReview[] | null) ?? []) {
        if (!reviewsByGym[r.gym_id]) reviewsByGym[r.gym_id] = [];
        reviewsByGym[r.gym_id].push(r);
      }

      return ((gyms as Gym[]) ?? []).map((g) => {
        const gymReviews = reviewsByGym[g.id] ?? [];
        const avgRating =
          gymReviews.length > 0
            ? Math.round((gymReviews.reduce((s, r) => s + r.rating, 0) / gymReviews.length) * 10) / 10
            : null;
        return { ...g, reviews: gymReviews, avgRating };
      });
    } catch {
      return [];
    }
  },
  ["gyms-with-reviews"],
  { tags: ["gyms"], revalidate: 3600 }
);
