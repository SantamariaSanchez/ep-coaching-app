"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { autoTags, deriveTitle, normalizeTag, parseTags, type NoteKind } from "@/lib/notes";
import { hashToken, newToken } from "@/lib/api-tokens";

// Notes (2026-09-30) : chacun écrit uniquement dans SES notes, l'identité
// vient toujours de la session.

type Result = { error?: string; id?: string };
const KINDS: NoteKind[] = ["note", "capture", "dictee", "lien", "tache"];
const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/gif": "gif" };

function refresh() {
  revalidatePath("/dashboard/coach/notes");
  revalidatePath("/dashboard/client/notes");
}

async function knownTags(ownerId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("notes").select("tags").eq("owner_id", ownerId).limit(1500);
  const set = new Set<string>();
  for (const r of (data ?? []) as { tags: string[] }[]) for (const t of r.tags ?? []) set.add(t);
  return [...set];
}

/** Capture rapide : titre, #tags et type déduits du texte. */
export async function createNoteAction(input: { text: string; kind?: NoteKind; tags?: string[] }): Promise<Result> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const text = (input.text ?? "").slice(0, 50000).trim();
  if (!text) return { error: "La note est vide." };
  const url = text.match(/^https?:\/\/\S+$/)?.[0] ?? null;
  const kind: NoteKind = input.kind && KINDS.includes(input.kind) ? input.kind : url ? "lien" : /^\s*(\[ \]|todo|à faire|a faire)\b/i.test(text) ? "tache" : "note";
  const explicit = [...parseTags(text), ...(input.tags ?? []).map(normalizeTag)].filter(Boolean);
  const tags = [...new Set([...explicit, ...(explicit.length ? [] : autoTags(text, await knownTags(guard.userId)))])];
  const body = text.replace(/^\s*\[ \]\s*/, "");
  const { data, error } = await createAdminClient()
    .from("notes")
    .insert({ owner_id: guard.userId, title: url ? url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 80) : deriveTitle(body), body, tags, kind, source_url: url })
    .select("id")
    .single();
  if (error || !data) {
    console.error("createNoteAction error:", error);
    return { error: "Note impossible à enregistrer." };
  }
  refresh();
  return { id: data.id as string };
}

/** Capture d'écran ou photo, avec un texte optionnel. */
export async function createCaptureAction(formData: FormData): Promise<Result> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const file = formData.get("image");
  const text = String(formData.get("text") ?? "").slice(0, 20000).trim();
  if (!(file instanceof File) || file.size === 0) return { error: "Choisis une image." };
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { error: "Formats acceptés : jpg, png, webp, heic, gif." };
  if (file.size > 10 * 1024 * 1024) return { error: "Image trop lourde (10 Mo max)." };
  const admin = createAdminClient();
  const path = `${guard.userId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await admin.storage.from("notes").upload(path, file, { contentType: file.type });
  if (upErr) {
    console.error("createCaptureAction upload:", upErr);
    return { error: "Envoi de l'image impossible." };
  }
  const tags = parseTags(text);
  const { data, error } = await admin
    .from("notes")
    .insert({ owner_id: guard.userId, title: deriveTitle(text) || "Capture", body: text, tags: tags.length ? tags : ["capture"], kind: "capture", attachment_path: path })
    .select("id")
    .single();
  if (error || !data) return { error: "Note impossible à enregistrer." };
  refresh();
  return { id: data.id as string };
}

export async function updateNoteAction(id: string, patch: { title?: string; body?: string; tags?: string[]; pinned?: boolean; done?: boolean; kind?: NoteKind }): Promise<Result> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof patch.title === "string") row.title = patch.title.slice(0, 200);
  if (typeof patch.body === "string") row.body = patch.body.slice(0, 50000);
  if (Array.isArray(patch.tags)) row.tags = [...new Set(patch.tags.map(normalizeTag).filter(Boolean))].slice(0, 30);
  if (typeof patch.body === "string" && !Array.isArray(patch.tags)) {
    // Un #tag tapé dans le texte rejoint les tags de la note.
    const { data: cur } = await createAdminClient().from("notes").select("tags").eq("id", id).eq("owner_id", guard.userId).maybeSingle();
    row.tags = [...new Set([...((cur?.tags as string[]) ?? []), ...parseTags(patch.body)])];
  }
  if (typeof patch.pinned === "boolean") row.pinned = patch.pinned;
  if (typeof patch.done === "boolean") row.done = patch.done;
  if (patch.kind && KINDS.includes(patch.kind)) row.kind = patch.kind;
  const { error } = await createAdminClient().from("notes").update(row).eq("id", id).eq("owner_id", guard.userId);
  if (error) return { error: "Modification impossible." };
  refresh();
  return {};
}

export async function deleteNoteAction(id: string): Promise<Result> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const admin = createAdminClient();
  const { data } = await admin.from("notes").select("attachment_path").eq("id", id).eq("owner_id", guard.userId).maybeSingle();
  if (!data) return { error: "Note introuvable." };
  if (data.attachment_path) await admin.storage.from("notes").remove([data.attachment_path as string]).catch(() => {});
  const { error } = await admin.from("notes").delete().eq("id", id).eq("owner_id", guard.userId);
  if (error) return { error: "Suppression impossible." };
  refresh();
  return {};
}

export async function setTagColorAction(name: string, color: string): Promise<Result> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const tag = normalizeTag(name);
  if (!tag || !/^#[0-9a-fA-F]{6}$/.test(color)) return { error: "Tag ou couleur invalide." };
  const { error } = await createAdminClient().from("note_tags").upsert({ owner_id: guard.userId, name: tag, color }, { onConflict: "owner_id,name" });
  if (error) return { error: "Impossible." };
  refresh();
  return {};
}

// ── Connecteur Claude (MCP) ────────────────────────────────────────────

export async function createApiTokenAction(name: string): Promise<{ error?: string; url?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const admin = createAdminClient();
  const { count } = await admin.from("api_tokens").select("id", { count: "exact", head: true }).eq("owner_id", guard.userId);
  if ((count ?? 0) >= 10) return { error: "10 clés maximum : supprime une ancienne clé." };
  const token = newToken();
  const { error } = await admin.from("api_tokens").insert({ owner_id: guard.userId, name: (name || "Claude").slice(0, 60), token_hash: hashToken(token) });
  if (error) return { error: "Clé impossible à créer." };
  refresh();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";
  return { url: `${appUrl}/api/mcp?key=${token}` };
}

export async function revokeApiTokenAction(id: string): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const { error } = await createAdminClient().from("api_tokens").delete().eq("id", id).eq("owner_id", guard.userId);
  if (error) return { error: "Suppression impossible." };
  refresh();
  return {};
}
