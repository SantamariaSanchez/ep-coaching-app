"use server";

import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCoachTier } from "@/lib/coach-tier";
import { cleanBrandName, isAllowedLogo, normalizeHex } from "@/lib/coach-branding";

// Marque personnalisée (lib/coach-branding.ts), réservée au plan Premium.
async function guardPremium(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return guard;
  if ((await getCoachTier(guard.userId)) !== "premium") return { ok: false, error: "La marque personnalisée fait partie du plan Premium." };
  return { ok: true, userId: guard.userId };
}

export async function saveCoachBrand(input: { name: string; color: string }): Promise<{ error?: string }> {
  const g = await guardPremium();
  if (!g.ok) return { error: g.error };
  const color = input.color ? normalizeHex(input.color) : null;
  if (input.color && !color) return { error: "Couleur invalide." };
  const { error } = await createAdminClient().from("profiles").update({ brand_name: cleanBrandName(input.name), brand_color: color }).eq("id", g.userId);
  if (error) return { error: "Enregistrement impossible, réessaie." };
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function uploadCoachLogo(form: FormData): Promise<{ error?: string; url?: string }> {
  const g = await guardPremium();
  if (!g.ok) return { error: g.error };
  const file = form.get("logo");
  if (!(file instanceof File)) return { error: "Aucun fichier." };
  if (!isAllowedLogo(file.type, file.size)) return { error: "Logo en PNG, JPEG ou WebP, 1 Mo au plus." };
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${g.userId}/logo-${Date.now()}.${ext}`;
  const admin = createAdminClient();
  const { error: upErr } = await admin.storage.from("brand-logos").upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });
  if (upErr) return { error: "Envoi du logo impossible, réessaie." };
  const url = admin.storage.from("brand-logos").getPublicUrl(path).data.publicUrl;
  const { error } = await admin.from("profiles").update({ brand_logo_url: url }).eq("id", g.userId);
  if (error) return { error: "Enregistrement impossible, réessaie." };
  revalidatePath("/dashboard", "layout");
  return { url };
}

export async function removeCoachLogo(): Promise<{ error?: string }> {
  const g = await guardPremium();
  if (!g.ok) return { error: g.error };
  const { error } = await createAdminClient().from("profiles").update({ brand_logo_url: null }).eq("id", g.userId);
  if (error) return { error: "Suppression impossible, réessaie." };
  revalidatePath("/dashboard", "layout");
  return {};
}
