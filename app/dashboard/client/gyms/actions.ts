"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { requireAuth, requireCoach, requireOwnClientOrSelf } from "@/lib/auth-guards";
import { revalidatePath, updateTag } from "next/cache";
import { GYMS_SEED, type GymType } from "@/lib/gyms-seed";
import type { EquipmentType } from "@/lib/exercise-library-content";

function refresh() {
  revalidatePath("/dashboard/client/gyms");
  revalidatePath("/dashboard/coach/gyms");
  revalidatePath("/dashboard/client/exercises");
  revalidatePath("/dashboard/coach/exercises");
  // getGymsWithReviews (utils/gyms.ts) est mis en cache 1h — sans ça, une
  // salle ou un avis modifié restait invisible jusqu'à expiration du cache
  // au lieu d'apparaître immédiatement.
  updateTag("gyms");
}

export interface CreateGymInput {
  name: string;
  city: string | null;
  address: string | null;
  equipment_notes: string | null;
  website: string | null;
  type: GymType;
  equipment_types: EquipmentType[];
}

// Open to everyone — coach and members (free or paying) build this directory together.
export async function createGym(input: CreateGymInput): Promise<{ error?: string; id?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  if (!input.name.trim()) return { error: "Le nom de la salle est requis." };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("gyms")
      .insert({
        name: input.name.trim(),
        city: input.city?.trim() || null,
        address: input.address?.trim() || null,
        equipment_notes: input.equipment_notes?.trim() || null,
        website: input.website?.trim() || null,
        type: input.type,
        equipment_types: input.equipment_types,
        created_by: guard.userId,
      })
      .select("id")
      .single();

    if (error || !data) return { error: "Erreur lors de la création." };
    refresh();
    return { id: data.id };
  } catch (e) {
    console.error("createGym error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function updateGym(id: string, input: CreateGymInput): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("gyms")
      .update({
        name: input.name.trim(),
        city: input.city?.trim() || null,
        address: input.address?.trim() || null,
        equipment_notes: input.equipment_notes?.trim() || null,
        website: input.website?.trim() || null,
        type: input.type,
        equipment_types: input.equipment_types,
      })
      .eq("id", id);

    if (error) return { error: "Erreur lors de la mise à jour." };
    refresh();
    return {};
  } catch (e) {
    console.error("updateGym error:", e);
    return { error: "Erreur inattendue." };
  }
}

// Imports the official gym chains straight from the app's code (see
// lib/gyms-seed.ts) instead of pasting SQL by hand — safe to click more
// than once. Also re-syncs fields (notably `type`) on entries that already
// exist by name, so a later seed-list correction (e.g. fixing a chain
// wrongly tagged "independante" by a column default) actually takes effect
// instead of being silently skipped because the name already exists.
export async function seedOfficialGyms(): Promise<{ error?: string; inserted?: number; updated?: number }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = createAdminClient();
    const { data: existing, error: fetchError } = await supabase.from("gyms").select("id, name, type");
    if (fetchError) return { error: "Erreur lors de la lecture de l'annuaire." };

    const existingByName = new Map((existing ?? []).map((r) => [r.name, r]));
    const missing = GYMS_SEED.filter((g) => !existingByName.has(g.name));
    const toSync = GYMS_SEED.filter((g) => {
      const row = existingByName.get(g.name);
      return row && row.type !== g.type;
    });

    if (missing.length > 0) {
      const { error } = await supabase.from("gyms").insert(
        missing.map((g) => ({
          name: g.name,
          city: g.city,
          address: g.address,
          equipment_notes: g.equipment_notes,
          website: g.website,
          type: g.type,
          created_by: null,
        }))
      );
      if (error) return { error: "Erreur lors de l'import." };
    }

    for (const g of toSync) {
      const row = existingByName.get(g.name)!;
      await supabase
        .from("gyms")
        .update({ type: g.type, equipment_notes: g.equipment_notes, website: g.website, city: g.city, address: g.address })
        .eq("id", row.id);
    }

    if (missing.length === 0 && toSync.length === 0) return { inserted: 0, updated: 0 };

    refresh();
    return { inserted: missing.length, updated: toSync.length };
  } catch (e) {
    console.error("seedOfficialGyms error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function deleteGym(id: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("gyms").delete().eq("id", id);
    if (error) return { error: "Erreur lors de la suppression." };
    refresh();
    return {};
  } catch (e) {
    console.error("deleteGym error:", e);
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
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("gym_reviews")
      .upsert(
        { gym_id: gymId, author_id: guard.userId, rating, comment: comment.trim() || null },
        { onConflict: "gym_id,author_id" }
      );

    if (error) return { error: "Erreur lors de l'enregistrement de l'avis." };
    refresh();
    return {};
  } catch (e) {
    console.error("upsertGymReview error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function deleteGymReview(reviewId: string): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = createAdminClient();
    await supabase.from("gym_reviews").delete().eq("id", reviewId).eq("author_id", guard.userId);
    refresh();
    return {};
  } catch (e) {
    console.error("deleteGymReview error:", e);
    return { error: "Erreur inattendue." };
  }
}

// "Ma salle" — un client pointe une entrée de l'annuaire comme la sienne au
// lieu de la retaper en texte libre dans sa fiche (gym_name/gym_link,
// utils/client-intake.ts). Upsert partiel (seulement ces deux colonnes) :
// ne touche à aucun autre champ de la fiche, contrairement à saveClientIntake
// qui réécrit la ligne entière depuis le formulaire d'onboarding.
export async function setMyGym(
  clientId: string,
  gymName: string,
  gymWebsite: string | null
): Promise<{ error?: string }> {
  const guard = await requireOwnClientOrSelf(clientId);
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("client_intake")
      .upsert(
        { client_id: clientId, gym_name: gymName, gym_link: gymWebsite, updated_at: new Date().toISOString() },
        { onConflict: "client_id" }
      );

    if (error) return { error: "Erreur lors de l'enregistrement." };
    refresh();
    revalidatePath(`/dashboard/coach/clients/${clientId}`);
    return {};
  } catch (e) {
    console.error("setMyGym error:", e);
    return { error: "Erreur inattendue." };
  }
}

// Variante sans clientId explicite, pour être passée directement comme
// prop onSetMyGym côté page client (app/dashboard/client/exercises/page.tsx).
// Avant ça, la page enveloppait setMyGym dans une closure inline capturant
// user.id — une fonction définie dans un Server Component ne peut pas être
// sérialisée telle quelle vers un Client Component (erreur runtime réelle
// en prod : "Event handlers cannot be passed to Client Component props",
// vue sur /dashboard/client/exercises depuis le 17/06/2026). Une vraie
// Server Action (ce fichier a "use server" en tête) qui redérive
// l'utilisateur courant elle-même n'a pas ce problème : elle se transmet
// comme référence stable, jamais comme closure.
export async function setMyGymForCurrentUser(
  gymName: string,
  gymWebsite: string | null
): Promise<void> {
  const guard = await requireAuth();
  if (!guard.ok) return;
  // Erreur avalée volontairement : même comportement que l'ancienne closure
  // inline qu'on remplace ici (elle non plus n'exposait pas l'erreur à
  // l'appelant), et onSetMyGym (GymsDirectoryView.tsx) est typé Promise<void>,
  // aucun consommateur ne lit ce retour.
  await setMyGym(guard.userId, gymName, gymWebsite);
}
