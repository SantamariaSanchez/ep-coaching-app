"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireOwnClient } from "@/lib/auth-guards";
import { isTrackingLevel, HISTORY_FLAGS, type TrackingLevel } from "@/lib/tracking-profile";

// Niveau de suivi (Simple / Standard / Avancé) : choisi en 1 tap par la
// personne, ou fixé par son coach. Stocké dans user_app_setup.answers
// (aucune migration). "auto" retire le choix et rend la main au moteur.
// Le coach ne modifie jamais le plan : ceci règle seulement ce qui est
// demandé à la personne au quotidien.

async function writeLevel(userId: string, level: TrackingLevel | "auto", by: "client" | "coach"): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { data: row } = await admin.from("user_app_setup").select("answers, modules, completed_at").eq("user_id", userId).maybeSingle();
  const answers: Record<string, unknown> = { ...((row?.answers as Record<string, unknown>) ?? {}) };
  if (level === "auto") {
    delete answers.tracking_level;
    delete answers.tracking_level_by;
  } else {
    answers.tracking_level = level;
    answers.tracking_level_by = by;
  }
  const { error } = await admin
    .from("user_app_setup")
    .upsert({ user_id: userId, answers, modules: row?.modules ?? {}, completed_at: row?.completed_at ?? null, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) {
    console.error("tracking level error:", error);
    return { error: "Enregistrement impossible, réessaie." };
  }
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function setTrackingLevelAction(level: string): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Non authentifié." };
  if (level !== "auto" && !isTrackingLevel(level)) return { error: "Choix invalide." };
  return writeLevel(user.id, level as TrackingLevel | "auto", "client");
}

export async function setClientTrackingLevelAction(clientId: string, level: string): Promise<{ error?: string }> {
  const guard = await requireOwnClient(clientId);
  if (!guard.ok) return { error: guard.error };
  if (level !== "auto" && !isTrackingLevel(level)) return { error: "Choix invalide." };
  const res = await writeLevel(clientId, level as TrackingLevel | "auto", "coach");
  if (!res.error) revalidatePath(`/dashboard/coach/clients/${clientId}`);
  return res;
}

/** Réponse du quiz d'onboarding « parcours » : alimente le moteur sans question de plus à la main. */
export async function saveTrackingParcoursAction(parcours: "aucun" | "phases" | "competition"): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Non authentifié." };
  const history = parcours === "competition" ? [...HISTORY_FLAGS] : parcours === "phases" ? ["prise_muscle", "deficit"] : [];
  const admin = createAdminClient();
  const { data: row } = await admin.from("user_app_setup").select("answers, modules, completed_at").eq("user_id", user.id).maybeSingle();
  const answers = { ...((row?.answers as Record<string, unknown>) ?? {}), historique: history };
  const { error } = await admin
    .from("user_app_setup")
    .upsert({ user_id: user.id, answers, modules: row?.modules ?? {}, completed_at: row?.completed_at ?? null, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { error: "Enregistrement impossible, réessaie." };
  return {};
}
