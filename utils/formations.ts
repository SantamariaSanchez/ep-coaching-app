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
  /** null = Académie EP ; sinon le coach propriétaire (migration 20260930b). */
  owner_id?: string | null;
  access_mode?: "inclus" | "payant";
  price_eur?: number | null;
  payment_url?: string | null;
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

/**
 * Catalogue : l'Académie EP (owner_id null) + les formations des coachs
 * donnés (ownerIds). `onlyOwner` : uniquement celles d'un propriétaire
 * (null = seulement l'Académie), pour l'éditeur.
 */
export async function getFormations(opts: { ownerIds?: string[]; onlyOwner?: string | null } = {}): Promise<Formation[]> {
  const supabase = await createServerSupabase();
  let q = supabase.from("formations").select("*");
  if (opts.onlyOwner !== undefined) {
    q = opts.onlyOwner === null ? q.is("owner_id", null) : q.eq("owner_id", opts.onlyOwner);
  } else {
    const owners = (opts.ownerIds ?? []).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    q = owners.length ? q.or(`owner_id.is.null,owner_id.in.(${owners.join(",")})`) : q.is("owner_id", null);
  }
  const { data } = await q.order("order_index");
  return (data ?? []) as Formation[];
}

/**
 * Droit de regarder les vidéos d'une formation.
 * - Académie EP : clients coachés (abonnement actif), comme avant.
 * - Formation d'un coach : le coach lui-même ; en mode "inclus" ses
 *   clients ; en mode "payant" les personnes à qui il a donné l'accès.
 */
export async function hasFormationAccess(
  formation: Pick<Formation, "id" | "owner_id" | "access_mode">,
  viewer: { id: string; coach_id?: string | null; subscription_status?: string | null }
): Promise<boolean> {
  if (!formation.owner_id) return viewer.subscription_status === "active";
  if (formation.owner_id === viewer.id) return true;
  if ((formation.access_mode ?? "inclus") === "inclus" && viewer.coach_id === formation.owner_id) return true;
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("formation_access").select("formation_id").eq("formation_id", formation.id).eq("user_id", viewer.id).maybeSingle();
  return !!data;
}

/** Formations de coachs auxquelles la personne a un accès donné (achat). */
export async function getGrantedFormationOwners(userId: string): Promise<string[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("formation_access").select("formations(owner_id)").eq("user_id", userId);
  const owners = ((data ?? []) as unknown as { formations: { owner_id: string | null } | null }[]).map((r) => r.formations?.owner_id).filter((id): id is string => !!id);
  return [...new Set(owners)];
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
// plus récentes. S'arrête à la première leçon toujours valide (publiée,
// avec une vidéo, dans une formation publiée) pour ne jamais proposer de
// reprendre une leçon retirée depuis, ni une leçon d'une formation encore en
// brouillon. includeDrafts : réservé au fondateur, qui prévisualise ses
// brouillons depuis son espace Moi.
export async function getResumeLesson(
  userId: string,
  options: { includeDrafts?: boolean } = {}
): Promise<ResumeLesson | null> {
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
        formation_sections: {
          formation_modules: { formations: { id: string; title: string; emoji: string; is_published: boolean } };
        };
      };
      if (!lesson.is_published || !lesson.youtube_id) continue;
      const formation = lesson.formation_sections?.formation_modules?.formations;
      if (!formation) continue;
      if (!formation.is_published && !options.includeDrafts) continue;
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

// Une leçon n'est regardable que publiée ET avec une vidéo : même règle
// partout (catalogue, détail, page leçon, progression).
export function isLessonWatchable(lesson: Pick<FormationLesson, "is_published" | "youtube_id">): boolean {
  return !!(lesson.is_published && lesson.youtube_id);
}

// publishedMin ne cumule QUE les leçons regardables. L'ancien totalMin
// additionnait la durée de toutes les leçons (brouillons compris, toutes à
// 10 min par défaut) : le catalogue affichait "0 vidéo" à côté de "6h50min".
export function countLessons(modules: FormationModule[]): {
  total: number;
  published: number;
  publishedMin: number;
} {
  let total = 0;
  let published = 0;
  let publishedMin = 0;
  for (const mod of modules) {
    for (const sec of mod.sections) {
      for (const lesson of sec.lessons) {
        total++;
        if (isLessonWatchable(lesson)) {
          published++;
          publishedMin += lesson.duration_min;
        }
      }
    }
  }
  return { total, published, publishedMin };
}

// Durée lisible : "45 min", "1h", "5h50". Remplace les formules inline en
// Math.round(min / 60) qui arrondissaient les heures au supérieur (350 min
// s'affichait "6h50min" au lieu de 5h50).
export function formatDuration(min: number): string {
  const total = Math.max(0, Math.round(min));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return `${hours}h${rest ? String(rest).padStart(2, "0") : ""}`;
}
