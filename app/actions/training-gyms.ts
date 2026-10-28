"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireAuth, requireOwnClient } from "@/lib/auth-guards";
import { GYM_KIND_LABELS, sanitizeEquipment, templateFor, type GymKind } from "@/lib/gym-equipment";

// Salles d'entraînement : le client gère les siennes, le coach celles de ses
// clients (et les siennes). Toutes les écritures passent par le client admin
// après contrôle de l'accès.

async function guardOwner(ownerId: string): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const a = await requireAuth();
  if (!a.ok) return { ok: false, error: a.error };
  if (a.userId === ownerId) return { ok: true, userId: a.userId };
  const c = await requireOwnClient(ownerId);
  return c.ok ? { ok: true, userId: c.userId } : { ok: false, error: c.error };
}

async function guardGym(gymId: string): Promise<{ ok: true; ownerId: string } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data } = await admin.from("training_gyms").select("owner_id").eq("id", gymId).maybeSingle();
  if (!data) return { ok: false, error: "Salle introuvable." };
  const g = await guardOwner((data as { owner_id: string }).owner_id);
  return g.ok ? { ok: true, ownerId: (data as { owner_id: string }).owner_id } : g;
}

function refresh() {
  revalidatePath("/dashboard/client/exercises");
  revalidatePath("/dashboard/coach/exercises");
  revalidatePath("/dashboard/client/program");
  revalidatePath("/dashboard/coach/clients", "layout");
}

const KINDS: GymKind[] = ["commerciale", "crossfit", "home_gym", "poids_du_corps", "custom"];

export async function createTrainingGym(input: {
  ownerId: string;
  name: string;
  city?: string | null;
  kind: GymKind;
}): Promise<{ error?: string; id?: string }> {
  const g = await guardOwner(input.ownerId);
  if (!g.ok) return { error: g.error };
  const kind = KINDS.includes(input.kind) ? input.kind : "custom";
  const name = input.name.trim().slice(0, 80) || GYM_KIND_LABELS[kind];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("training_gyms")
    .insert({ owner_id: input.ownerId, created_by: g.userId, name, city: input.city?.trim().slice(0, 80) || null, kind, equipment: templateFor(kind)?.equipment ?? [] })
    .select("id")
    .single();
  if (error || !data) return { error: "Impossible de créer la salle (la migration salles est-elle passée ?)." };
  refresh();
  return { id: (data as { id: string }).id };
}

export async function updateTrainingGym(
  gymId: string,
  patch: { name?: string; city?: string | null; address?: string | null; notes?: string | null; kind?: GymKind; equipment?: string[] }
): Promise<{ error?: string }> {
  const g = await guardGym(gymId);
  if (!g.ok) return { error: g.error };
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name.trim().slice(0, 80) || "Salle";
  if (patch.city !== undefined) row.city = patch.city?.trim().slice(0, 80) || null;
  if (patch.address !== undefined) row.address = patch.address?.trim().slice(0, 160) || null;
  if (patch.notes !== undefined) row.notes = patch.notes?.trim().slice(0, 500) || null;
  if (patch.kind !== undefined && KINDS.includes(patch.kind)) row.kind = patch.kind;
  if (patch.equipment !== undefined) row.equipment = sanitizeEquipment(patch.equipment);
  const { error } = await createAdminClient().from("training_gyms").update(row).eq("id", gymId);
  if (error) return { error: "Enregistrement impossible." };
  refresh();
  return {};
}

export async function deleteTrainingGym(gymId: string): Promise<{ error?: string }> {
  const g = await guardGym(gymId);
  if (!g.ok) return { error: g.error };
  const { error } = await createAdminClient().from("training_gyms").delete().eq("id", gymId);
  if (error) return { error: "Suppression impossible." };
  refresh();
  return {};
}

const MAX_PHOTO_BYTES = 6 * 1024 * 1024;

/** Ajoute une photo de machine (bucket gym-photos). Les équipements tagués sont ajoutés à la salle. */
export async function addGymPhoto(gymId: string, form: FormData): Promise<{ error?: string; photo?: { id: string; url: string; equipment: string[] } }> {
  const g = await guardGym(gymId);
  if (!g.ok) return { error: g.error };
  const file = form.get("photo");
  if (!(file instanceof File) || !file.type.startsWith("image/")) return { error: "Choisis une image." };
  if (file.size > MAX_PHOTO_BYTES) return { error: "Image trop lourde (6 Mo max)." };
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${g.ownerId}/${gymId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const admin = createAdminClient();
  const up = await admin.storage.from("gym-photos").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type === "image/png" || file.type === "image/webp" ? file.type : "image/jpeg" });
  if (up.error) return { error: "Envoi impossible (le bucket gym-photos existe-t-il ?)." };
  const url = admin.storage.from("gym-photos").getPublicUrl(path).data.publicUrl;
  let tags: string[] = [];
  try {
    tags = sanitizeEquipment(JSON.parse(String(form.get("equipment") ?? "[]")));
  } catch {
    tags = [];
  }
  const { data, error } = await admin.from("training_gym_photos").insert({ gym_id: gymId, url, storage_path: path, equipment: tags }).select("id").single();
  if (error || !data) return { error: "Photo envoyée mais non enregistrée." };
  if (tags.length > 0) {
    const { data: gym } = await admin.from("training_gyms").select("equipment").eq("id", gymId).single();
    const merged = sanitizeEquipment([...(((gym as { equipment: string[] | null } | null)?.equipment) ?? []), ...tags]);
    await admin.from("training_gyms").update({ equipment: merged, updated_at: new Date().toISOString() }).eq("id", gymId);
  }
  refresh();
  return { photo: { id: (data as { id: string }).id, url, equipment: tags } };
}

export async function deleteGymPhoto(photoId: string): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { data } = await admin.from("training_gym_photos").select("gym_id, storage_path").eq("id", photoId).maybeSingle();
  if (!data) return { error: "Photo introuvable." };
  const row = data as { gym_id: string; storage_path: string | null };
  const g = await guardGym(row.gym_id);
  if (!g.ok) return { error: g.error };
  if (row.storage_path) await admin.storage.from("gym-photos").remove([row.storage_path]);
  await admin.from("training_gym_photos").delete().eq("id", photoId);
  refresh();
  return {};
}

/** Rattache une séance du programme à une salle (null : aucune). Action explicite du coach ou du client. */
export async function setDayGym(dayId: string, gymId: string | null): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { data: day } = await admin.from("program_days").select("program_id").eq("id", dayId).maybeSingle();
  if (!day) return { error: "Séance introuvable." };
  const { data: prog } = await admin.from("programs").select("client_id").eq("id", (day as { program_id: string }).program_id).maybeSingle();
  if (!prog) return { error: "Programme introuvable." };
  const g = await guardOwner((prog as { client_id: string }).client_id);
  if (!g.ok) return { error: g.error };
  if (gymId) {
    const { data: gym } = await admin.from("training_gyms").select("owner_id").eq("id", gymId).maybeSingle();
    if (!gym || (gym as { owner_id: string }).owner_id !== (prog as { client_id: string }).client_id) return { error: "Salle invalide." };
  }
  const { error } = await admin.from("program_days").update({ gym_id: gymId }).eq("id", dayId);
  if (error) return { error: "Enregistrement impossible." };
  refresh();
  return {};
}
