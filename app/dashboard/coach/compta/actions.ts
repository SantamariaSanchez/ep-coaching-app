"use server";

import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { categoriesFor } from "@/lib/coach-finance-categories";

// Axe 4 (VISION.md) : journal revenus/dépenses personnel du coach.

export async function createFinanceEntry(input: {
  kind: "revenu" | "depense";
  category: string;
  label: string;
  amount: number;
  entryDate: string;
  note?: string;
}): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const label = input.label.trim();
  if (!label) return { error: "Libellé requis." };
  if (label.length > 200) return { error: "Libellé trop long (200 caractères max)." };
  if (!Number.isFinite(input.amount) || input.amount <= 0) return { error: "Montant invalide." };
  if (input.amount > 1_000_000) return { error: "Montant trop élevé." };
  if (!categoriesFor(input.kind).includes(input.category)) return { error: "Catégorie invalide." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.entryDate)) return { error: "Date invalide." };

  const admin = createAdminClient();
  const { error } = await admin.from("coach_finance_entries").insert({
    coach_id: guard.userId,
    kind: input.kind,
    category: input.category,
    label,
    amount: Math.round(input.amount * 100) / 100,
    entry_date: input.entryDate,
    note: input.note?.trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/compta");
  return { success: true };
}

export async function deleteFinanceEntry(id: string): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_finance_entries")
    .delete()
    .eq("id", id)
    .eq("coach_id", guard.userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/coach/compta");
  return { success: true };
}

// Import d'un relevé bancaire (CSV) : lignes déjà relues par le coach dans
// l'aperçu, catégories éventuellement corrigées. source = "import".
export async function importFinanceEntries(
  rows: { kind: "revenu" | "depense"; category: string; label: string; amount: number; entryDate: string }[]
): Promise<{ error?: string; inserted?: number }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (!Array.isArray(rows) || rows.length === 0) return { error: "Aucune ligne à importer." };
  if (rows.length > 2000) return { error: "2 000 lignes maximum par import." };

  const clean = [];
  for (const r of rows) {
    const label = String(r.label ?? "").trim().slice(0, 200);
    if (r.kind !== "revenu" && r.kind !== "depense") return { error: "Type invalide." };
    if (!label) return { error: "Une ligne n'a pas de libellé." };
    if (!Number.isFinite(r.amount) || r.amount <= 0 || r.amount > 1_000_000) return { error: `Montant invalide : ${label}.` };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.entryDate)) return { error: `Date invalide : ${label}.` };
    const category = categoriesFor(r.kind).includes(r.category) ? r.category : r.kind === "revenu" ? "Autre revenu" : "Autre dépense";
    clean.push({
      coach_id: guard.userId,
      kind: r.kind,
      category,
      label,
      amount: Math.round(r.amount * 100) / 100,
      entry_date: r.entryDate,
      source: "import",
    });
  }

  const admin = createAdminClient();
  for (let i = 0; i < clean.length; i += 500) {
    const { error } = await admin.from("coach_finance_entries").insert(clean.slice(i, i + 500));
    if (error) return { error: error.message, inserted: i };
  }
  revalidatePath("/dashboard/coach/compta");
  return { inserted: clean.length };
}

// Corriger une ligne (catégorie, libellé, montant, date) sans la supprimer.
export async function updateFinanceEntry(
  id: string,
  patch: { category?: string; label?: string; amount?: number; entryDate?: string; kind?: "revenu" | "depense" }
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("coach_finance_entries")
    .select("kind")
    .eq("id", id)
    .eq("coach_id", guard.userId)
    .maybeSingle();
  if (!current) return { error: "Ligne introuvable." };

  const kind = patch.kind ?? (current.kind as "revenu" | "depense");
  const update: Record<string, unknown> = {};
  if (patch.kind) update.kind = patch.kind;
  if (patch.category !== undefined) {
    if (!categoriesFor(kind).includes(patch.category)) return { error: "Catégorie invalide." };
    update.category = patch.category;
  } else if (patch.kind) {
    update.category = kind === "revenu" ? "Autre revenu" : "Autre dépense";
  }
  if (patch.label !== undefined) {
    const label = patch.label.trim();
    if (!label || label.length > 200) return { error: "Libellé invalide." };
    update.label = label;
  }
  if (patch.amount !== undefined) {
    if (!Number.isFinite(patch.amount) || patch.amount <= 0 || patch.amount > 1_000_000) return { error: "Montant invalide." };
    update.amount = Math.round(patch.amount * 100) / 100;
  }
  if (patch.entryDate !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(patch.entryDate)) return { error: "Date invalide." };
    update.entry_date = patch.entryDate;
  }
  if (Object.keys(update).length === 0) return { success: true };

  const { error } = await admin.from("coach_finance_entries").update(update).eq("id", id).eq("coach_id", guard.userId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/coach/compta");
  return { success: true };
}

// Objectif du mois, taux de cotisations (le coach le renseigne : il dépend
// de son statut, on ne code aucun taux légal), prix de l'offre principale.
export async function saveFinanceSettings(input: {
  monthlyGoal: number | null;
  contributionRate: number | null;
  offerPrice: number | null;
}): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  const ok = (v: number | null, max: number) => v === null || (Number.isFinite(v) && v >= 0 && v <= max);
  if (!ok(input.monthlyGoal, 10_000_000)) return { error: "Objectif invalide." };
  if (!ok(input.contributionRate, 100)) return { error: "Taux invalide (entre 0 et 100 %)." };
  if (!ok(input.offerPrice, 1_000_000)) return { error: "Prix invalide." };

  const admin = createAdminClient();
  const { error } = await admin.from("coach_finance_settings").upsert(
    {
      coach_id: guard.userId,
      monthly_goal: input.monthlyGoal,
      contribution_rate: input.contributionRate,
      offer_price: input.offerPrice,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "coach_id" }
  );
  if (error) return { error: error.message };
  revalidatePath("/dashboard/coach/compta");
  return { success: true };
}
