"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { composeWeeklyNote, hasLivedMarker, ideaFromLivedNote, type WeeklyAnswers } from "@/lib/lived-content";
import { getLivedNotes } from "@/lib/lived-content-server";

type Result = { error?: string; created?: number };

/** Enregistre « ma semaine » : une note #vécu avec seulement les réponses données. */
export async function saveWeeklyLivedAction(answers: WeeklyAnswers): Promise<Result> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const cleaned: WeeklyAnswers = {};
  for (const [k, v] of Object.entries(answers ?? {})) if (typeof v === "string") cleaned[k] = v.slice(0, 4000);
  const note = composeWeeklyNote(cleaned);
  if (!note) return { error: "Réponds au moins à une question." };
  const { error } = await createAdminClient()
    .from("notes")
    .insert({ owner_id: guard.userId, title: note.title, body: note.text, tags: note.tags, kind: "note" });
  if (error) {
    console.error("saveWeeklyLivedAction error:", error);
    return { error: "Note impossible à enregistrer." };
  }
  revalidatePath("/dashboard/coach/studio");
  revalidatePath("/dashboard/coach/notes");
  return {};
}

/**
 * Transforme les notes vécues pas encore exploitées en idées de contenu
 * (Studio > Idées). Le texte de la note est repris tel quel : rien n'est
 * inventé, et une note ne devient idée qu'une seule fois.
 */
export async function livedNotesToIdeasAction(): Promise<Result> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const admin = createAdminClient();
  const [notes, { data: existing }] = await Promise.all([
    getLivedNotes(guard.userId, 90, 20),
    admin.from("content_ideas").select("notes").eq("coach_id", guard.userId).like("notes", "Source : ta note vécue%").limit(500),
  ]);
  const used = (existing ?? []) as { notes: string | null }[];
  const fresh = notes.filter((n) => !used.some((u) => hasLivedMarker(u.notes, n.id)));
  if (!fresh.length) return { created: 0 };
  const rows = fresh.map((n) => {
    const idea = ideaFromLivedNote(n);
    return { coach_id: guard.userId, title: idea.title, notes: idea.notes, platform: idea.platform, status: "idee", source: "manuel", content_format: idea.content_format };
  });
  let { error } = await admin.from("content_ideas").insert(rows);
  if (error) {
    // Migration 20261021 pas encore passée : sans format de contenu.
    ({ error } = await admin.from("content_ideas").insert(rows.map(({ content_format: _f, ...r }) => r)));
  }
  if (error) return { error: "Création des idées impossible, réessaie." };
  revalidatePath("/dashboard/coach/studio");
  return { created: rows.length };
}
