"use server";

import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import type { PantryItem, PantryUnit } from "@/lib/pantry";

// Inventaire de courses (2026-10-07) : chacun ne touche qu'à SON stock,
// l'identité vient toujours de la session. Toute variation laisse une ligne
// dans pantry_movements pour pouvoir expliquer le stock.

type Result = { error?: string };
type ExistingRow = { id: string; unit: PantryUnit; quantity: number; grams_per_unit: number | null };
const UNITS: PantryUnit[] = ["g", "piece", "ml"];
const COLS = "id, food_id, name, category, unit, quantity, grams_per_unit, low_threshold, updated_at";

function clampQty(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(Math.max(v, 0), 1_000_000) : 0;
}

export async function getPantryAction(): Promise<{ items: PantryItem[]; error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { items: [], error: guard.error };
  const { data, error } = await createAdminClient().from("pantry_items").select(COLS).eq("owner_id", guard.userId).order("name");
  if (error) return { items: [], error: "Impossible de charger ton stock." };
  return { items: ((data ?? []) as PantryItem[]).map((i) => ({ ...i, quantity: Number(i.quantity), grams_per_unit: i.grams_per_unit == null ? null : Number(i.grams_per_unit), low_threshold: i.low_threshold == null ? null : Number(i.low_threshold) })) };
}

/**
 * Ajoute des courses au stock. Si l'aliment est déjà en stock, la quantité
 * s'additionne (même unité) ; sinon l'article est créé.
 */
export async function addToPantryAction(
  purchases: { foodId?: string | null; name: string; category?: string | null; unit: PantryUnit; quantity: number; gramsPerUnit?: number | null; lowThreshold?: number | null }[]
): Promise<Result> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const admin = createAdminClient();
  for (const p of purchases.slice(0, 100)) {
    const name = (p.name ?? "").trim().slice(0, 120);
    const unit = UNITS.includes(p.unit) ? p.unit : "g";
    const qty = clampQty(p.quantity);
    if (!name || qty <= 0) continue;
    let existing: ExistingRow | null = null;
    if (p.foodId) {
      const { data } = await admin.from("pantry_items").select("id, unit, quantity, grams_per_unit").eq("owner_id", guard.userId).eq("food_id", p.foodId).maybeSingle();
      existing = data as ExistingRow | null;
    } else {
      const { data } = await admin.from("pantry_items").select("id, unit, quantity, grams_per_unit").eq("owner_id", guard.userId).is("food_id", null).ilike("name", name).maybeSingle();
      existing = data as ExistingRow | null;
    }
    if (existing) {
      // Conversion si l'achat est saisi dans une autre unité que le stock.
      let add = qty;
      if (existing.unit !== unit) {
        const grams = unit === "piece" ? qty * (Number(p.gramsPerUnit) || 100) : qty;
        add = existing.unit === "piece" ? grams / (Number(existing.grams_per_unit) || 100) : grams;
      }
      await admin.from("pantry_items").update({ quantity: Number(existing.quantity) + add, updated_at: new Date().toISOString() }).eq("id", existing.id);
      await admin.from("pantry_movements").insert({ owner_id: guard.userId, item_id: existing.id, delta: add, reason: "achat" });
    } else {
      const { data: created, error } = await admin
        .from("pantry_items")
        .insert({
          owner_id: guard.userId,
          food_id: p.foodId ?? null,
          name,
          category: (p.category ?? "Divers").slice(0, 60),
          unit,
          quantity: qty,
          grams_per_unit: unit === "piece" ? Number(p.gramsPerUnit) || 100 : null,
          low_threshold: p.lowThreshold == null ? null : clampQty(p.lowThreshold),
        })
        .select("id")
        .single();
      if (error || !created) return { error: "Impossible d'ajouter cet article." };
      await admin.from("pantry_movements").insert({ owner_id: guard.userId, item_id: created.id, delta: qty, reason: "achat" });
    }
  }
  return {};
}

/** Ajuste le stock d'un article (+ / -, jeté, inventaire refait). */
export async function adjustPantryAction(id: string, newQuantity: number, reason: "ajustement" | "jete" = "ajustement"): Promise<Result> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const admin = createAdminClient();
  const { data: item } = await admin.from("pantry_items").select("id, quantity").eq("id", id).eq("owner_id", guard.userId).maybeSingle();
  if (!item) return { error: "Article introuvable." };
  const qty = clampQty(newQuantity);
  const delta = qty - Number(item.quantity);
  if (delta === 0) return {};
  await admin.from("pantry_items").update({ quantity: qty, updated_at: new Date().toISOString() }).eq("id", id);
  await admin.from("pantry_movements").insert({ owner_id: guard.userId, item_id: id, delta, reason: delta > 0 ? "achat" : reason });
  return {};
}

export async function updatePantryItemAction(id: string, fields: { name?: string; unit?: PantryUnit; gramsPerUnit?: number | null; lowThreshold?: number | null }): Promise<Result> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.name !== undefined) patch.name = fields.name.trim().slice(0, 120) || "Article";
  if (fields.unit !== undefined && UNITS.includes(fields.unit)) patch.unit = fields.unit;
  if (fields.gramsPerUnit !== undefined) patch.grams_per_unit = fields.gramsPerUnit == null ? null : Math.max(1, clampQty(fields.gramsPerUnit));
  if (fields.lowThreshold !== undefined) patch.low_threshold = fields.lowThreshold == null ? null : clampQty(fields.lowThreshold);
  const { error } = await createAdminClient().from("pantry_items").update(patch).eq("id", id).eq("owner_id", guard.userId);
  return error ? { error: "Modification impossible." } : {};
}

export async function deletePantryItemAction(id: string): Promise<Result> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const { error } = await createAdminClient().from("pantry_items").delete().eq("id", id).eq("owner_id", guard.userId);
  return error ? { error: "Suppression impossible." } : {};
}
