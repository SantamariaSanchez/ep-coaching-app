import { createAdminClient } from "@/lib/supabase-admin";

// Notes façon Obsidian/Tana (2026-09-30). Lectures en service role,
// toujours filtrées sur la personne connectée (passée par la page).

export type NoteKind = "note" | "capture" | "dictee" | "lien" | "tache";

export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  kind: NoteKind;
  attachment_path: string | null;
  source_url: string | null;
  pinned: boolean;
  done: boolean;
  created_at: string;
  updated_at: string;
  /** URL signée de la capture (1 h), calculée à la lecture. */
  imageUrl?: string | null;
}

export interface NoteTag {
  name: string;
  color: string;
  description: string | null;
}

/** "#Idée-reel" → "idée-reel" (tags en minuscules, accents gardés). */
export function normalizeTag(raw: string): string {
  return raw.replace(/^#/, "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}_-]/gu, "").slice(0, 40);
}

/** Tags écrits dans le texte : #mot (lettres, chiffres, tirets). */
export function parseTags(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/(^|\s)#([\p{L}\p{N}_-]{2,40})/gu)) out.add(normalizeTag(m[2]));
  return [...out];
}

/** Liens [[Titre d'une note]] présents dans le texte. */
export function parseLinks(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/\[\[([^\]\n]{1,120})\]\]/g)) out.add(m[1].trim());
  return [...out];
}

/** Titre par défaut : première ligne, sans les #tags. */
export function deriveTitle(text: string): string {
  const first = (text.split("\n").find((l) => l.trim()) ?? "").replace(/(^|\s)#[\p{L}\p{N}_-]+/gu, " ").trim();
  return first.length > 80 ? `${first.slice(0, 77).trimEnd()}...` : first;
}

/**
 * Rangement automatique : ajoute les tags déjà utilisés par la personne
 * dont le nom apparaît en toutes lettres dans la note (ex. une note qui
 * parle de "script" rejoint #script).
 */
export function autoTags(text: string, known: string[]): string[] {
  const lower = ` ${text.toLowerCase()} `;
  return known.filter((t) => t.length >= 3 && new RegExp(`[^\\p{L}\\p{N}]${t.replace(/[-]/g, "[- ]")}s?[^\\p{L}\\p{N}]`, "u").test(lower));
}

export async function getNotes(ownerId: string): Promise<{ notes: Note[]; tags: NoteTag[] }> {
  const admin = createAdminClient();
  const [{ data: rows }, { data: tagRows }] = await Promise.all([
    admin
      .from("notes")
      .select("id, title, body, tags, kind, attachment_path, source_url, pinned, done, created_at, updated_at")
      .eq("owner_id", ownerId)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1500),
    admin.from("note_tags").select("name, color, description").eq("owner_id", ownerId),
  ]);
  const notes = (rows ?? []) as Note[];
  const paths = notes.map((n) => n.attachment_path).filter((p): p is string => !!p);
  if (paths.length) {
    const { data: signed } = await admin.storage.from("notes").createSignedUrls(paths, 3600);
    const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
    for (const n of notes) if (n.attachment_path) n.imageUrl = byPath.get(n.attachment_path) ?? null;
  }
  return { notes, tags: (tagRows ?? []) as NoteTag[] };
}

/** Recherche plein texte (titre, contenu, tags), pour la recherche globale. */
export async function searchNotes(ownerId: string, q: string, limit = 6): Promise<{ id: string; title: string; excerpt: string }[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("notes")
    .select("id, title, body")
    .eq("owner_id", ownerId)
    .textSearch("search", q, { type: "websearch", config: "french" })
    .limit(limit);
  let rows = (data ?? []) as { id: string; title: string; body: string }[];
  if (!rows.length) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    const { data: fallback } = await admin.from("notes").select("id, title, body").eq("owner_id", ownerId).or(`title.ilike.${like},body.ilike.${like}`).limit(limit);
    rows = (fallback ?? []) as typeof rows;
  }
  return rows.map((r) => ({ id: r.id, title: r.title || deriveTitle(r.body) || "Note", excerpt: r.body.replace(/\s+/g, " ").slice(0, 90) }));
}
