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
