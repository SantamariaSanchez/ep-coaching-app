"use server";

import { revalidatePath } from "next/cache";
import { getUser, getProfile } from "@/utils/auth";
import { runSocialSync } from "@/lib/social/sync";
import type { Platform } from "@/lib/social/platforms";

// Actions du tableau de bord Stats réseaux : réservées au propriétaire de la
// plateforme (profiles.is_platform_owner), vérifié à chaque appel.

async function requireOwner(): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Non authentifié." };
  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) return { ok: false, error: "Réservé au fondateur." };
  return { ok: true };
}

const PLATFORMS: Platform[] = ["instagram", "tiktok", "youtube", "facebook", "linkedin", "threads"];

export interface SyncNowResult {
  error?: string;
  results?: { platform: string; status: string; rows: number; error?: string }[];
  linked?: number;
}

export async function syncNowAction(platform: string | null, backfill: boolean): Promise<SyncNowResult> {
  const guard = await requireOwner();
  if (!guard.ok) return { error: guard.error };
  const p = platform && (PLATFORMS as string[]).includes(platform) ? (platform as Platform) : null;
  try {
    const res = await runSocialSync({ platform: p, trigger: backfill ? "backfill" : "manuel", days: 30, backfill, budgetMs: 240_000 });
    revalidatePath("/dashboard/coach/admin/stats-reseaux");
    return {
      results: res.results.map((r) => ({ platform: r.platform, status: r.status, rows: r.rows, ...(r.error ? { error: r.error } : {}) })),
      linked: res.linked,
    };
  } catch (e) {
    console.error("syncNowAction error:", e);
    return { error: e instanceof Error ? e.message : "Synchro impossible." };
  }
}
