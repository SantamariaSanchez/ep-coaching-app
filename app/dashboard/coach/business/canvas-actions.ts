"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { cleanText, LIMITS } from "@/lib/sanitize";
import { CANVAS_BLOCKS, type CanvasBlockKey } from "@/lib/coach-business-canvas";

const VALID_KEYS = new Set<string>(CANVAS_BLOCKS.map((b) => b.key));

export async function saveCanvasBlock(key: CanvasBlockKey, value: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (!VALID_KEYS.has(key)) return { error: "Bloc invalide." };

  const clean = cleanText(value, LIMITS.longForm) ?? "";

  const admin = createAdminClient();
  const { error } = await admin.from("coach_business_canvas").upsert({
    coach_id: guard.userId,
    [key]: clean || null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Erreur lors de l'enregistrement." };

  revalidatePath("/dashboard/coach/business");
  return {};
}
