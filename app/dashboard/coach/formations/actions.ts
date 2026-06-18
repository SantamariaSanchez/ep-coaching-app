"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { getUser, getProfile } from "@/utils/auth";
import { revalidatePath } from "next/cache";

async function requireCoachForFormations() {
  const user = await getUser();
  if (!user) throw new Error("Non authentifié");
  const profile = await getProfile(user.id);
  if (!profile || profile.role !== "coach") throw new Error("Accès refusé");
  return user;
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
