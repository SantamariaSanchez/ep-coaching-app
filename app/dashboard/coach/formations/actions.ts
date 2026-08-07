"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { requireCoach } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";

// Ce fichier dupliquait requireCoach() à la main (getUser + lecture du rôle),
// et passait donc à côté du contrôle de force de session : un compte coach
// avec 2FA activée pouvait éditer tout le catalogue de formations avec le
// seul mot de passe. On délègue maintenant au vrai guard partagé.
async function requireCoachForFormations() {
  const guard = await requireCoach();
  if (!guard.ok) throw new Error(guard.error);
  return guard;
}

export async function updateLessonYoutube(lessonId: string, youtubeId: string, isPublished: boolean) {
  await requireCoachForFormations();
  const supabase = await createServerSupabase();

  // Extract YouTube ID from full URL if needed
  const id = extractYoutubeId(youtubeId.trim()) ?? youtubeId.trim();

  const { error } = await supabase
    .from("formation_lessons")
    .update({ youtube_id: id || null, is_published: isPublished })
    .eq("id", lessonId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/client/formations", "layout");
  revalidatePath("/dashboard/coach/formations", "layout");
  return { success: true };
}

export async function updateFormation(formationId: string, data: {
  title?: string;
  subtitle?: string;
  description?: string;
  emoji?: string;
  is_published?: boolean;
}) {
  await requireCoachForFormations();
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("formations")
    .update(data)
    .eq("id", formationId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/client/formations", "layout");
  revalidatePath("/dashboard/coach/formations", "layout");
  return { success: true };
}

export async function updateModuleTitle(moduleId: string, title: string) {
  await requireCoachForFormations();
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("formation_modules")
    .update({ title })
    .eq("id", moduleId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/client/formations", "layout");
  revalidatePath("/dashboard/coach/formations", "layout");
  return { success: true };
}

export async function updateSectionTitle(sectionId: string, title: string) {
  await requireCoachForFormations();
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("formation_sections")
    .update({ title })
    .eq("id", sectionId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/client/formations", "layout");
  revalidatePath("/dashboard/coach/formations", "layout");
  return { success: true };
}

export async function updateLessonTitle(lessonId: string, title: string) {
  await requireCoachForFormations();
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("formation_lessons")
    .update({ title })
    .eq("id", lessonId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/client/formations", "layout");
  revalidatePath("/dashboard/coach/formations", "layout");
  return { success: true };
}

// ── Réorganisation ───────────────────────────────────────────────────────────
// Jusqu'ici impossible de changer l'ordre après coup (seulement ajouter en
// fin de liste) — avec 148 leçons déjà créées sur 5 formations, corriger
// l'ordre d'une section obligeait à tout supprimer et recréer. Échange de
// order_index avec le voisin immédiat, même principe que moveDay/moveExercise
// dans ProgramEditor.

export async function moveModule(formationId: string, moduleId: string, direction: "up" | "down") {
  await requireCoachForFormations();
  const supabase = await createServerSupabase();

  const { data: modules } = await supabase
    .from("formation_modules")
    .select("id, order_index")
    .eq("formation_id", formationId)
    .order("order_index");
  if (!modules) return { error: "Erreur." };

  const idx = modules.findIndex((m) => m.id === moduleId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= modules.length) return { success: true };

  const a = modules[idx];
  const b = modules[swapIdx];
  await supabase.from("formation_modules").update({ order_index: b.order_index }).eq("id", a.id);
  await supabase.from("formation_modules").update({ order_index: a.order_index }).eq("id", b.id);

  revalidatePath(`/dashboard/coach/formations/${formationId}`);
  revalidatePath("/dashboard/client/formations", "layout");
  return { success: true };
}

export async function moveSection(moduleId: string, sectionId: string, direction: "up" | "down") {
  await requireCoachForFormations();
  const supabase = await createServerSupabase();

  const { data: sections } = await supabase
    .from("formation_sections")
    .select("id, order_index")
    .eq("module_id", moduleId)
    .order("order_index");
  if (!sections) return { error: "Erreur." };

  const idx = sections.findIndex((s) => s.id === sectionId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= sections.length) return { success: true };

  const a = sections[idx];
  const b = sections[swapIdx];
  await supabase.from("formation_sections").update({ order_index: b.order_index }).eq("id", a.id);
  await supabase.from("formation_sections").update({ order_index: a.order_index }).eq("id", b.id);

  revalidatePath("/dashboard/coach/formations", "layout");
  revalidatePath("/dashboard/client/formations", "layout");
  return { success: true };
}

export async function moveLesson(sectionId: string, lessonId: string, direction: "up" | "down") {
  await requireCoachForFormations();
  const supabase = await createServerSupabase();

  const { data: lessons } = await supabase
    .from("formation_lessons")
    .select("id, order_index")
    .eq("section_id", sectionId)
    .order("order_index");
  if (!lessons) return { error: "Erreur." };

  const idx = lessons.findIndex((l) => l.id === lessonId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= lessons.length) return { success: true };

  const a = lessons[idx];
  const b = lessons[swapIdx];
  await supabase.from("formation_lessons").update({ order_index: b.order_index }).eq("id", a.id);
  await supabase.from("formation_lessons").update({ order_index: a.order_index }).eq("id", b.id);

  revalidatePath("/dashboard/coach/formations", "layout");
  revalidatePath("/dashboard/client/formations", "layout");
  return { success: true };
}

// ── Détail de leçon ──────────────────────────────────────────────────────────
// description et duration_min existent en base depuis le début mais n'étaient
// éditables nulle part dans l'UI (duration_min restait figé à 10, la valeur
// par défaut de la création) — pourtant affichés côté client (VideoPlayer,
// listes de leçons).

export async function updateLessonDetails(
  lessonId: string,
  data: { description?: string; duration_min?: number }
) {
  await requireCoachForFormations();
  const supabase = await createServerSupabase();

  const { error } = await supabase.from("formation_lessons").update(data).eq("id", lessonId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/client/formations", "layout");
  revalidatePath("/dashboard/coach/formations", "layout");
  return { success: true };
}

// ── Publication en masse ─────────────────────────────────────────────────────
// Avec 148 leçons déjà créées et 0 publiées, publier une par une n'est pas
// réaliste — permet de publier (ou masquer) d'un coup toutes les leçons d'un
// module qui ont déjà une vidéo YouTube renseignée (jamais celles qui n'en
// ont pas : publier une leçon sans vidéo casserait son affichage client).
export async function publishSectionLessons(sectionId: string, publish: boolean) {
  await requireCoachForFormations();
  const supabase = await createServerSupabase();

  let query = supabase.from("formation_lessons").update({ is_published: publish }).eq("section_id", sectionId);
  if (publish) query = query.not("youtube_id", "is", null);
  const { error } = await query;

  if (error) return { error: error.message };
  revalidatePath("/dashboard/client/formations", "layout");
  revalidatePath("/dashboard/coach/formations", "layout");
  return { success: true };
}

// ── Duplication ──────────────────────────────────────────────────────────────
// Réutiliser la structure d'un module existant (mêmes titres de section,
// mêmes leçons vides à remplir) plutôt que retaper "Introduction / Théorie /
// Pratique" à la main à chaque nouvelle section — les vidéos elles-mêmes ne
// sont jamais copiées (youtube_id reste vide sur les leçons dupliquées), pas
// de contenu publié par erreur.
export async function duplicateModule(moduleId: string) {
  await requireCoachForFormations();
  const supabase = await createServerSupabase();

  const { data: source } = await supabase
    .from("formation_modules")
    .select("*, formation_sections(*, formation_lessons(*))")
    .eq("id", moduleId)
    .single();
  if (!source) return { error: "Section introuvable." };

  const { count } = await supabase
    .from("formation_modules")
    .select("id", { count: "exact", head: true })
    .eq("formation_id", source.formation_id);

  const { data: newModule, error: moduleError } = await supabase
    .from("formation_modules")
    .insert({ formation_id: source.formation_id, title: `${source.title} (copie)`, order_index: count ?? 0 })
    .select()
    .single();
  if (moduleError || !newModule) return { error: "Erreur lors de la duplication." };

  type SourceLesson = { title: string; description: string | null; duration_min: number; order_index: number };
  type SourceSection = { title: string; order_index: number; formation_lessons: SourceLesson[] };
  const sections = ((source.formation_sections ?? []) as SourceSection[]).sort((a, b) => a.order_index - b.order_index);

  for (const sec of sections) {
    const { data: newSection, error: sectionError } = await supabase
      .from("formation_sections")
      .insert({ module_id: newModule.id, title: sec.title, order_index: sec.order_index })
      .select()
      .single();
    if (sectionError || !newSection) continue;

    const lessons = (sec.formation_lessons ?? []).sort((a, b) => a.order_index - b.order_index);
    if (lessons.length > 0) {
      await supabase.from("formation_lessons").insert(
        lessons.map((l) => ({
          section_id: newSection.id,
          title: l.title,
          description: l.description,
          duration_min: l.duration_min,
          order_index: l.order_index,
          // youtube_id et is_published volontairement omis (vides par défaut)
        }))
      );
    }
  }

  revalidatePath(`/dashboard/coach/formations/${source.formation_id}`);
  return { success: true };
}

export async function addModule(formationId: string, title: string, orderIndex: number) {
  await requireCoachForFormations();
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("formation_modules")
    .insert({ formation_id: formationId, title, order_index: orderIndex });

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/coach/formations/${formationId}`);
  return { success: true };
}

export async function addSection(moduleId: string, title: string, orderIndex: number) {
  await requireCoachForFormations();
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("formation_sections")
    .insert({ module_id: moduleId, title, order_index: orderIndex });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/coach/formations", "layout");
  return { success: true };
}

export async function addLesson(sectionId: string, title: string, orderIndex: number) {
  await requireCoachForFormations();
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("formation_lessons")
    .insert({ section_id: sectionId, title, order_index: orderIndex, duration_min: 10 });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/coach/formations", "layout");
  return { success: true };
}

// Suppressions — les sections/leçons enfants sont détruites automatiquement
// par les ON DELETE CASCADE côté DB (voir supabase/migrations/add_formation_sections.sql).
export async function deleteModule(moduleId: string) {
  await requireCoachForFormations();
  const supabase = await createServerSupabase();

  const { error } = await supabase.from("formation_modules").delete().eq("id", moduleId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/client/formations", "layout");
  revalidatePath("/dashboard/coach/formations", "layout");
  return { success: true };
}

export async function deleteSection(sectionId: string) {
  await requireCoachForFormations();
  const supabase = await createServerSupabase();

  const { error } = await supabase.from("formation_sections").delete().eq("id", sectionId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/client/formations", "layout");
  revalidatePath("/dashboard/coach/formations", "layout");
  return { success: true };
}

export async function deleteLesson(lessonId: string) {
  await requireCoachForFormations();
  const supabase = await createServerSupabase();

  const { error } = await supabase.from("formation_lessons").delete().eq("id", lessonId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/client/formations", "layout");
  revalidatePath("/dashboard/coach/formations", "layout");
  return { success: true };
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "formation";
}

export async function createFormation(
  title: string,
  emoji: string
): Promise<{ error?: string; id?: string }> {
  await requireCoachForFormations();
  const supabase = await createServerSupabase();

  const { count } = await supabase
    .from("formations")
    .select("id", { count: "exact", head: true });

  const { data, error } = await supabase
    .from("formations")
    .insert({
      title,
      slug: `${slugify(title)}-${Date.now().toString(36)}`,
      emoji: emoji || "📚",
      color: "#E01E1E",
      order_index: count ?? 0,
      is_published: false,
    })
    .select()
    .single();

  if (error || !data) return { error: error?.message ?? "Erreur." };
  revalidatePath("/dashboard/coach/formations", "layout");
  return { id: data.id };
}

export async function deleteFormation(formationId: string) {
  await requireCoachForFormations();
  const supabase = await createServerSupabase();

  const { error } = await supabase.from("formations").delete().eq("id", formationId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/client/formations", "layout");
  revalidatePath("/dashboard/coach/formations", "layout");
  return { success: true };
}

function extractYoutubeId(input: string): string | null {
  if (!input) return null;
  // Already an ID (no slashes/dots)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  // Full URL
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return null;
}
