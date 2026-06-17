import { createServerSupabase } from "@/lib/supabase-server";

export interface Formation {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  emoji: string;
  color: string;
  order_index: number;
  is_published: boolean;
  created_at: string;
}

export interface FormationModule {
  id: string;
  formation_id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons?: FormationLesson[];
}

export interface FormationLesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  youtube_id: string | null;
  duration_min: number;
  order_index: number;
  is_published: boolean;
}

export interface FormationProgress {
  user_id: string;
  lesson_id: string;
  completed_at: string;
}

export async function getFormations(): Promise<Formation[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("formations")
    .select("*")
    .order("order_index");
  return (data ?? []) as Formation[];
}

export async function getFormation(id: string): Promise<Formation | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("formations")
    .select("*")
    .eq("id", id)
    .single();
  return (data ?? null) as Formation | null;
}

export interface FormationWithModules extends Formation {
  modules: (FormationModule & { lessons: FormationLesson[] })[];
}

export async function getFormationWithModules(formationId: string): Promise<FormationWithModules | null> {
  const supabase = await createServerSupabase();

  const { data: formation } = await supabase
    .from("formations")
    .select("*")
    .eq("id", formationId)
    .single();

  if (!formation) return null;

  const { data: modules } = await supabase
    .from("formation_modules")
    .select("*, formation_lessons(*)")
    .eq("formation_id", formationId)
    .order("order_index");

  return {
    ...(formation as Formation),
    modules: ((modules ?? []) as (FormationModule & { formation_lessons: FormationLesson[] })[]).map((m) => ({
      ...m,
      lessons: (m.formation_lessons ?? []).sort((a, b) => a.order_index - b.order_index),
    })),
  };
}

export async function getLesson(lessonId: string): Promise<FormationLesson | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("formation_lessons")
    .select("*")
    .eq("id", lessonId)
    .single();
  return (data ?? null) as FormationLesson | null;
}

export async function getLessonWithContext(lessonId: string) {
  const supabase = await createServerSupabase();

  const { data: lesson } = await supabase
    .from("formation_lessons")
    .select("*, formation_modules!inner(*, formations!inner(*))")
    .eq("id", lessonId)
    .single();

  if (!lesson) return null;
  return lesson;
}

export async function getUserProgress(userId: string): Promise<Set<string>> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("formation_progress")
    .select("lesson_id")
    .eq("user_id", userId);
  return new Set((data ?? []).map((r: { lesson_id: string }) => r.lesson_id));
}

export function countLessons(modules: (FormationModule & { lessons: FormationLesson[] })[]): {
  total: number;
  published: number;
  totalMin: number;
} {
  let total = 0;
  let published = 0;
  let totalMin = 0;
  for (const mod of modules) {
    for (const lesson of mod.lessons) {
      total++;
      if (lesson.is_published && lesson.youtube_id) published++;
      totalMin += lesson.duration_min;
    }
  }
  return { total, published, totalMin };
}
