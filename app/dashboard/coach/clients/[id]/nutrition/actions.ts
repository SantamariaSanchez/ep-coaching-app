"use server";
import { requireOwnClientOrSelf } from "@/lib/auth-guards";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import type { NutritionProfileInput } from "@/utils/nutrition";
import { notifyUser } from "@/lib/notify";
import { alreadyNotifiedToday } from "@/utils/insert-notification";
import { rescaleActiveDietPlanToTargets } from "./diet-plan-actions";

export async function saveNutritionProfile(
  clientId: string,
  data: NutritionProfileInput
): Promise<{ error?: string }> {
  const guard = await requireOwnClientOrSelf(clientId);
  if (!guard.ok) return { error: guard.error };
  try {
    // Use admin client - coach writes to another user profile (bypasses RLS)
    const supabase = createAdminClient();

    const fields = {
      calories_target: data.calories_target,
      proteins_target: data.proteins_target,
      carbs_target: data.carbs_target,
      fats_target: data.fats_target,
      calories_offset_rest: data.calories_offset_rest ?? null,
      calories_offset_high: data.calories_offset_high ?? null,
      tdee: data.tdee,
      bmr: data.bmr,
      phase: data.phase,
      gender: data.gender,
      weight: data.weight ?? null,
      height: data.height,
      age: data.age,
      training_type: data.training_type,
      sessions_per_week: data.sessions_per_week,
      session_duration: data.session_duration,
      steps_per_day: data.steps_per_day,
      activity_level: data.activity_level,
      updated_at: new Date().toISOString(),
    };

    // Explicit select-then-update-or-insert instead of upsert(onConflict):
    // this doesn't depend on a unique constraint actually existing on
    // client_id in the live DB, which is what let stale duplicate rows
    // pile up and made saves look like they "kept the old data".
    // On récupère aussi les anciennes cibles ici : c'est ce qui permet de
    // savoir plus bas si les calories/macros ont réellement bougé, et donc
    // si le plan de diète actif doit être réajusté.
    const { data: existingRows } = await supabase
      .from("nutrition_profiles")
      .select("id, calories_target, proteins_target, carbs_target, fats_target")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false });

    let error;
    if (existingRows && existingRows.length > 0) {
      ({ error } = await supabase
        .from("nutrition_profiles")
        .update(fields)
        .eq("id", existingRows[0].id));
      // Clean up any extra duplicate rows from past buggy upserts
      if (existingRows.length > 1) {
        await supabase
          .from("nutrition_profiles")
          .delete()
          .in("id", existingRows.slice(1).map((r) => r.id));
      }
    } else {
      ({ error } = await supabase
        .from("nutrition_profiles")
        .insert({ client_id: clientId, ...fields }));
    }

    if (error) {
      console.error("saveNutritionProfile error:", error);
      return { error: "Erreur lors de la sauvegarde." };
    }

    // Cibles caloriques/macros modifiées (et pas juste poids/pas/activité,
    // qui repassent aussi par ce même save) : le plan de diète déjà
    // construit doit suivre automatiquement, sans repasser aliment par
    // aliment à la main.
    const previous = existingRows?.[0];
    const targetsChanged =
      !previous ||
      Number(previous.calories_target) !== data.calories_target ||
      Number(previous.proteins_target) !== data.proteins_target ||
      Number(previous.carbs_target) !== data.carbs_target ||
      Number(previous.fats_target) !== data.fats_target;
    if (targetsChanged) {
      // Attendu (pas fire-and-forget) : les revalidatePath juste en dessous
      // doivent voir les grammages déjà réajustés, sinon le premier
      // rechargement du plan affiche encore les anciennes quantités.
      try {
        await rescaleActiveDietPlanToTargets(clientId, {
          calories: data.calories_target,
          proteins: data.proteins_target,
          carbs: data.carbs_target,
          fats: data.fats_target,
        });
      } catch (e) {
        console.error("rescaleActiveDietPlanToTargets error:", e);
      }
    }

    revalidatePath(`/dashboard/coach/clients/${clientId}/nutrition`);
    revalidatePath(`/dashboard/client/nutrition`);
    revalidatePath(`/dashboard/coach/moi/nutrition`);

    // Uniquement quand c'est le coach qui agit, et une seule fois par jour —
    // un coach qui affine ses réglages en plusieurs sauvegardes successives
    // ne doit pas déclencher une notification à chaque clic.
    if (guard.userId !== clientId) {
      notifyClientTargetsUpdated(clientId, guard.userId).catch(() => {});
    }

    return {};
  } catch (e) {
    console.error("saveNutritionProfile exception:", e);
    return { error: "Erreur inattendue." };
  }
}

async function notifyClientTargetsUpdated(clientId: string, coachId: string): Promise<void> {
  if (await alreadyNotifiedToday(clientId, "nutrition_targets_updated", coachId)) return;
  await notifyUser(clientId, {
    type: "nutrition_targets_updated",
    title: "🎯 Objectifs nutrition mis à jour",
    body: "Ton coach a ajusté tes objectifs caloriques/macros.",
    url: "/dashboard/client/nutrition",
    senderId: coachId,
  });
}

// ── Compléments alimentaires — suggestion coach ──────────────────────────

export async function suggestSupplement(
  clientId: string,
  input: { name: string; dosage?: string; timing?: string; notes?: string }
): Promise<{ error?: string }> {
  const guard = await requireOwnClientOrSelf(clientId);
  if (!guard.ok) return { error: guard.error };
  if (!input.name.trim()) return { error: "Le nom est requis." };

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("client_supplements").insert({
      client_id: clientId,
      name: input.name.trim(),
      dosage: input.dosage?.trim() || null,
      timing: input.timing?.trim() || null,
      notes: input.notes?.trim() || null,
      suggested_by: guard.userId,
    });
    if (error) return { error: "Erreur lors de l'ajout." };
    revalidatePath(`/dashboard/coach/clients/${clientId}/nutrition`);
    revalidatePath(`/dashboard/client/nutrition`);

    // Coach uniquement — l'usage "moi/nutrition" du coach passe aussi par
    // cette action pour son propre suivi (guard.userId === clientId dans ce
    // cas), pas besoin de se notifier soi-même.
    if (guard.userId !== clientId) {
      notifyUser(clientId, {
        type: "supplement_suggested",
        title: "💊 Nouveau complément suggéré",
        body: `Ton coach te suggère : ${input.name.trim()}${input.dosage ? ` (${input.dosage.trim()})` : ""}.`,
        url: "/dashboard/client/nutrition",
        senderId: guard.userId,
      }).catch(() => {});
    }

    return {};
  } catch (e) {
    console.error("suggestSupplement error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function setSupplementStatus(
  clientId: string,
  supplementId: string,
  status: "active" | "stopped"
): Promise<{ error?: string }> {
  const guard = await requireOwnClientOrSelf(clientId);
  if (!guard.ok) return { error: guard.error };

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("client_supplements")
      .update({ status })
      .eq("id", supplementId)
      .eq("client_id", clientId);
    if (error) return { error: "Erreur lors de la mise à jour." };
    revalidatePath(`/dashboard/coach/clients/${clientId}/nutrition`);
    return {};
  } catch (e) {
    console.error("setSupplementStatus error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function deleteSupplement(
  clientId: string,
  supplementId: string
): Promise<{ error?: string }> {
  const guard = await requireOwnClientOrSelf(clientId);
  if (!guard.ok) return { error: guard.error };

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("client_supplements")
      .delete()
      .eq("id", supplementId)
      .eq("client_id", clientId);
    if (error) return { error: "Erreur lors de la suppression." };
    revalidatePath(`/dashboard/coach/clients/${clientId}/nutrition`);
    return {};
  } catch (e) {
    console.error("deleteSupplement error:", e);
    return { error: "Erreur inattendue." };
  }
}
