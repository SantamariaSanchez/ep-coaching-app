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

export interface FormationSection {
  id: string;
  module_id: string;
  title: string;
  order_index: number;
  lessons: FormationLesson[];
}

export interface FormationModule {
  id: string;
  formation_id: string;
  title: string;
  description: string | null;
  order_index: number;
  sections: FormationSection[];
}

export interface FormationLesson {
  id: string;
  section_id: string;
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

export interface FormationWithModules extends Formation {
  modules: FormationModule[];
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
    .select(`
      *,
      formation_sections (
        *,
        formation_lessons (*)
      )
    `)
    .eq("formation_id", formationId)
    .order("order_index");

  type RawLesson = Omit<FormationLesson, "section_id"> & { section_id: string };
  type RawSection = Omit<FormationSection, "lessons"> & { formation_lessons: RawLesson[] };
  type RawModule = Omit<FormationModule, "sections"> & { formation_sections: RawSection[] };

  return {
    ...(formation as Formation),
    modules: ((modules ?? []) as RawModule[]).map((m) => ({
      ...m,
      sections: (m.formation_sections ?? [])
        .sort((a, b) => a.order_index - b.order_index)
        .map((s) => ({
          ...s,
          lessons: (s.formation_lessons ?? []).sort((a, b) => a.order_index - b.order_index),
        })),
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
    .select("*, formation_sections!inner(*, formation_modules!inner(*, formations!inner(*)))")
    .eq("id", lessonId)
    .single();
  if (!lesson) return null;
  return lesson;
}

// ── Reprendre où on en était ─────────────────────────────────────────────────
// "Vu" (formation_lesson_views) est distinct de "terminé" (formation_progress
// ci-dessous) — une leçon commencée mais pas terminée doit rester proposée en
// "Reprendre", pas disparaître du suivi.
export async function recordLessonView(userId: string, lessonId: string): Promise<void> {
  try {
    const supabase = await createServerSupabase();
    await supabase
      .from("formation_lesson_views")
      .upsert({ user_id: userId, lesson_id: lessonId, viewed_at: new Date().toISOString() }, { onConflict: "user_id,lesson_id" });
  } catch {
    // Best-effort : ne bloque jamais l'affichage de la leçon pour ça.
  }
}

export interface ResumeLesson {
  lessonId: string;
  lessonTitle: string;
  formationId: string;
  formationTitle: string;
  formationEmoji: string;
}

// Dernière leçon vue mais pas encore terminée, en repartant des vues les
// plus récentes — s'arrête à la première leçon toujours valide (publiée,
// avec une vidéo) pour ne jamais proposer de reprendre une leçon retirée
// depuis.
export async function getResumeLesson(userId: string): Promise<ResumeLesson | null> {
  try {
    const supabase = await createServerSupabase();
    const { data: views } = await supabase
      .from("formation_lesson_views")
      .select("lesson_id")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(20);
    if (!views || views.length === 0) return null;

    const { data: completedRows } = await supabase
      .from("formation_progress")
      .select("lesson_id")
      .eq("user_id", userId);
    const completedIds = new Set((completedRows ?? []).map((r: { lesson_id: string }) => r.lesson_id));

    for (const v of views as { lesson_id: string }[]) {
      if (completedIds.has(v.lesson_id)) continue;
      const context = await getLessonWithContext(v.lesson_id);
      if (!context) continue;
      const lesson = context as unknown as {
        id: string;
        title: string;
        is_published: boolean;
        youtube_id: string | null;
        formation_sections: { formation_modules: { formations: { id: string; title: string; emoji: string } } };
      };
      if (!lesson.is_published || !lesson.youtube_id) continue;
      const formation = lesson.formation_sections?.formation_modules?.formations;
      if (!formation) continue;
      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        formationId: formation.id,
        formationTitle: formation.title,
        formationEmoji: formation.emoji,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getUserProgress(userId: string): Promise<Set<string>> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("formation_progress")
    .select("lesson_id")
    .eq("user_id", userId);
  return new Set((data ?? []).map((r: { lesson_id: string }) => r.lesson_id));
}

export function countLessons(modules: FormationModule[]): {
  total: number;
  published: number;
  totalMin: number;
} {
  let total = 0;
  let published = 0;
  let totalMin = 0;
  for (const mod of modules) {
    for (const sec of mod.sections) {
      for (const lesson of sec.lessons) {
        total++;
        if (lesson.is_published && lesson.youtube_id) published++;
        totalMin += lesson.duration_min;
      }
    }
  }
  return { total, published, totalMin };
}
