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
