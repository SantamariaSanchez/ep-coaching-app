"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { requireAuth, requireCoach } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";

function refresh() {
  revalidatePath("/dashboard/client/gyms");
  revalidatePath("/dashboard/coach/gyms");
}

export interface CreateGymInput {
  name: string;
  city: string | null;
  address: string | null;
  equipment_notes: string | null;
  website: string | null;
}

// Open to everyone — coach and members (free or paying) build this directory together.
export async function createGym(input: CreateGymInput): Promise<{ error?: string; id?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  if (!input.name.trim()) return { error: "Le nom de la salle est requis." };

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("gyms")
      .insert({
        name: input.name.trim(),
        city: input.city?.trim() || null,
        address: input.address?.trim() || null,
        equipment_notes: input.equipment_notes?.trim() || null,
        website: input.website?.trim() || null,
        created_by: guard.userId,
      })
      .select("id")
      .single();

    if (error || !data) return { error: "Erreur lors de la création." };
    refresh();
    return { id: data.id };
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function updateGym(id: string, input: CreateGymInput): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("gyms")
      .update({
        name: input.name.trim(),
        city: input.city?.trim() || null,
        address: input.address?.trim() || null,
        equipment_notes: input.equipment_notes?.trim() || null,
        website: input.website?.trim() || null,
      })
      .eq("id", id);

    if (error) return { error: "Erreur lors de la mise à jour." };
    refresh();
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deleteGym(id: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.from("gyms").delete().eq("id", id);
    if (error) return { error: "Erreur lors de la suppression." };
    refresh();
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

// One review per member per gym — re-submitting updates it (upsert).
export async function upsertGymReview(
  gymId: string,
  rating: number,
  comment: string
): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  if (rating < 1 || rating > 5) return { error: "Note invalide." };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("gym_reviews")
      .upsert(
        { gym_id: gymId, author_id: guard.userId, rating, comment: comment.trim() || null },
        { onConflict: "gym_id,author_id" }
      );

    if (error) return { error: "Erreur lors de l'enregistrement de l'avis." };
    refresh();
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deleteGymReview(reviewId: string): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    await supabase.from("gym_reviews").delete().eq("id", reviewId).eq("author_id", guard.userId);
    refresh();
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
