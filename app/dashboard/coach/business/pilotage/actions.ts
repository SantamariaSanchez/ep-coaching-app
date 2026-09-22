"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import { todayInParis } from "@/lib/dates";

// Pilotage business du coach (non-négociables quotidiens + objectifs
// mensuels) — voir lib/business-non-negotiables.ts pour le contexte et les
// migrations 20260922_business_non_negotiables.sql pour le schéma.

const PATH = "/dashboard/coach/business/pilotage";

function parseNonNegativeInt(value: number | null | undefined, label: string): { ok: true; value: number | null } | { ok: false; error: string } {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) return { ok: false, error: `${label} invalide.` };
  return { ok: true, value };
}

export async function upsertNonNegotiablesDay(input: {
  logDate?: string;
  readingPages?: number | null;
  mindfulnessMinutes?: number | null;
  objectivesMorning?: boolean;
  objectivesMidday?: boolean;
  objectivesEvening?: boolean;
  contentMinutes?: number | null;
  contentPosts?: number | null;
  outreachConversations?: number | null;
}): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const limited = await enforceRateLimit(`non-negotiables-log:${guard.userId}`, PRESETS.write.limit, PRESETS.write.windowSeconds);
  if (limited) return { error: "Trop d'enregistrements d'un coup, réessaie dans un instant." };

  const logDate = input.logDate || todayInParis();
  // Jamais une date future — les non-négociables se logguent pour un jour vécu, pas à l'avance.
  if (logDate > todayInParis()) return { error: "Impossible de logger un jour qui n'est pas encore arrivé." };

  const patch: Record<string, string | number | boolean | null> = {
    coach_id: guard.userId,
    log_date: logDate,
    updated_at: new Date().toISOString(),
  };

  for (const [key, col, label] of [
    ["readingPages", "reading_pages", "Pages lues"],
    ["mindfulnessMinutes", "mindfulness_minutes", "Minutes de pleine conscience"],
    ["contentMinutes", "content_minutes", "Minutes de création"],
    ["contentPosts", "content_posts", "Posts publiés"],
    ["outreachConversations", "outreach_conversations", "Conversations outreach"],
  ] as const) {
    if (input[key] === undefined) continue;
    const parsed = parseNonNegativeInt(input[key] as number | null, label);
    if (!parsed.ok) return { error: parsed.error };
    patch[col] = parsed.value;
  }

  if (input.objectivesMorning !== undefined) patch.objectives_morning = input.objectivesMorning;
  if (input.objectivesMidday !== undefined) patch.objectives_midday = input.objectivesMidday;
  if (input.objectivesEvening !== undefined) patch.objectives_evening = input.objectivesEvening;

  const admin = createAdminClient();
  const { error } = await admin
    .from("business_non_negotiables_log")
    .upsert(patch, { onConflict: "coach_id,log_date" });
  if (error) return { error: error.message };

  revalidatePath(PATH);
  return { success: true };
}

export async function saveMonthlyObjectives(objectives: string[]): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const cleaned = objectives.map((o) => o.trim()).filter(Boolean).slice(0, 5);
  if (cleaned.some((o) => o.length > 300)) return { error: "Un objectif est trop long (300 caractères max)." };

  const monthStart = todayInParis().slice(0, 7) + "-01";
  const admin = createAdminClient();
  const { error } = await admin
    .from("business_monthly_objectives")
    .upsert(
      { coach_id: guard.userId, month_start: monthStart, objectives: cleaned, updated_at: new Date().toISOString() },
      { onConflict: "coach_id,month_start" }
    );
  if (error) return { error: error.message };

  revalidatePath(PATH);
  return { success: true };
}
