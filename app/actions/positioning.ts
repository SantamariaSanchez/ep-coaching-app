"use server";

import { getUser } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { cleanPositioning, type Positioning } from "@/lib/positioning";

// Enregistre le positionnement du coach (sauvegarde automatique pendant la
// saisie). Les champs sont nettoyés côté serveur, jamais pris tels quels.
export async function savePositioningAction(data: Positioning): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Non authentifié." };
  const { error } = await createAdminClient()
    .from("coach_positioning")
    .upsert({ owner_id: user.id, data: cleanPositioning(data), updated_at: new Date().toISOString() }, { onConflict: "owner_id" });
  if (error) {
    console.error("savePositioningAction error:", error);
    return { error: "Enregistrement impossible, réessaie." };
  }
  return {};
}
