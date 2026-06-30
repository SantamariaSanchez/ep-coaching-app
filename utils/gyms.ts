import { createAdminClient } from "@/lib/supabase-admin";
import type { GymType } from "@/lib/gyms-seed";

export interface Gym {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  equipment_notes: string | null;
  website: string | null;
  type: GymType | null;
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

export async function getGymsWithReviews(): Promise<GymWithReviews[]> {
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
}
