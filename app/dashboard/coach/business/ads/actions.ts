"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import { todayInParis } from "@/lib/dates";
import { AD_STATUSES, type AdStatus } from "@/lib/ad-campaigns";

// Outil de pilotage manuel de la pub payante — voir lib/ad-campaigns.ts et
// la migration 20260916a_ad_campaigns.sql pour le contexte complet.

const PATH = "/dashboard/coach/business/ads";

function parseNonNegative(value: number | null | undefined, label: string): { ok: true; value: number | null } | { ok: false; error: string } {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (!Number.isFinite(value) || value < 0) return { ok: false, error: `${label} invalide.` };
  return { ok: true, value };
}

export async function createAdCampaign(input: {
  name: string;
  platform: string;
  objective: string;
  budgetDaily?: number | null;
  budgetTotal?: number | null;
  startDate?: string | null;
  notes?: string;
}): Promise<{ error?: string; success?: boolean; id?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const limited = await enforceRateLimit(`ad-campaign-create:${guard.userId}`, PRESETS.write.limit, PRESETS.write.windowSeconds);
  if (limited) return { error: "Trop de campagnes créées d'un coup, réessaie dans un instant." };

  const name = input.name.trim();
  if (!name) return { error: "Nom de campagne requis." };
  if (name.length > 200) return { error: "Nom trop long (200 caractères max)." };

  const platform = input.platform.trim().toLowerCase() || "meta";
  const objective = input.objective.trim().toLowerCase() || "leads";
  if (platform.length > 40) return { error: "Plateforme invalide." };
  if (objective.length > 40) return { error: "Objectif invalide." };

  const budgetDaily = parseNonNegative(input.budgetDaily, "Budget quotidien");
  if (!budgetDaily.ok) return { error: budgetDaily.error };
  const budgetTotal = parseNonNegative(input.budgetTotal, "Budget total");
  if (!budgetTotal.ok) return { error: budgetTotal.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ad_campaigns")
    .insert({
      coach_id: guard.userId,
      name,
      platform,
      objective,
      budget_daily: budgetDaily.value,
      budget_total: budgetTotal.value,
      start_date: input.startDate || todayInParis(),
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath(PATH);
  return { success: true, id: data?.id };
}

// Un seul point d'entrée pour toutes les mises à jour (chiffres relevés,
// statut, notes...) — même choix que updateSalesCall (admin/ventes/actions.ts) :
// la ligne se met à jour au fil de l'eau, jamais en masse.
export async function updateAdCampaign(
  id: string,
  updates: Partial<{
    name: string;
    platform: string;
    objective: string;
    status: AdStatus;
    budgetDaily: number | null;
    budgetTotal: number | null;
    spendTotal: number;
    impressions: number;
    clicks: number;
    leads: number;
    revenueGenerated: number | null;
    startDate: string | null;
    endDate: string | null;
    notes: string;
    stoppedReason: string;
  }>
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const patch: Record<string, string | number | null> = { updated_at: new Date().toISOString() };

  if (updates.name !== undefined) {
    const name = updates.name.trim();
    if (!name) return { error: "Nom de campagne requis." };
    if (name.length > 200) return { error: "Nom trop long (200 caractères max)." };
    patch.name = name;
  }
  if (updates.platform !== undefined) {
    const platform = updates.platform.trim().toLowerCase();
    if (!platform || platform.length > 40) return { error: "Plateforme invalide." };
    patch.platform = platform;
  }
  if (updates.objective !== undefined) {
    const objective = updates.objective.trim().toLowerCase();
    if (!objective || objective.length > 40) return { error: "Objectif invalide." };
    patch.objective = objective;
  }
  if (updates.status !== undefined) {
    if (!(AD_STATUSES as readonly string[]).includes(updates.status)) return { error: "Statut invalide." };
    patch.status = updates.status;
  }
  if (updates.notes !== undefined) patch.notes = updates.notes.trim() || null;
  if (updates.stoppedReason !== undefined) patch.stopped_reason = updates.stoppedReason.trim() || null;
  if (updates.startDate !== undefined) patch.start_date = updates.startDate || null;
  if (updates.endDate !== undefined) patch.end_date = updates.endDate || null;

  for (const [key, col, label] of [
    ["budgetDaily", "budget_daily", "Budget quotidien"],
    ["budgetTotal", "budget_total", "Budget total"],
    ["revenueGenerated", "revenue_generated", "Revenu généré"],
  ] as const) {
    if (updates[key] === undefined) continue;
    const parsed = parseNonNegative(updates[key] as number | null, label);
    if (!parsed.ok) return { error: parsed.error };
    patch[col] = parsed.value;
  }

  for (const [key, col, label] of [
    ["spendTotal", "spend_total", "Dépense"],
    ["impressions", "impressions", "Impressions"],
    ["clicks", "clicks", "Clics"],
    ["leads", "leads", "Leads"],
  ] as const) {
    const val = updates[key];
    if (val === undefined) continue;
    if (!Number.isFinite(val) || val < 0) return { error: `${label} invalide.` };
    patch[col] = val;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("ad_campaigns").update(patch).eq("id", id).eq("coach_id", guard.userId);
  if (error) return { error: error.message };

  revalidatePath(PATH);
  return { success: true };
}

export async function deleteAdCampaign(id: string): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin.from("ad_campaigns").delete().eq("id", id).eq("coach_id", guard.userId);
  if (error) return { error: error.message };

  revalidatePath(PATH);
  return { success: true };
}
