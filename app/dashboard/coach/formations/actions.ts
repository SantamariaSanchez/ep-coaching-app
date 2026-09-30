"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireCoach } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import { notifyUsers } from "@/lib/notify";
import {
  extractYoutubeId,
  isYoutubeId,
  MAX_YOUTUBE_LINES,
  type YoutubePreview,
  type YoutubePreviewStatus,
} from "@/lib/youtube";

// ── Qui a le droit d'éditer ─────────────────────────────────────────────────
// L'Académie EP est un contenu de PLATEFORME (les 5 formations, leurs 148
// leçons, les scripts du fondateur), pas un contenu par coach : aucune
// colonne owner_id sur formations. Jusqu'ici chaque action ne vérifiait que
// role = "coach", or l'inscription coach est publique : n'importe quel coach
// inscrit en 2 minutes pouvait renommer, dépublier ou supprimer toute
// l'Académie (cascade sur les leçons). Chaque action exige donc maintenant
// le propriétaire de la plateforme (requirePlatformOwner, qui applique aussi
// la 2FA du compte). Le guard renvoie { error } au lieu de lever : l'ancien
// throw faisait planter runAction() côté éditeur au lieu d'afficher l'erreur.

const MSG_INVALID_URL =
  "URL YouTube non reconnue. Colle un lien youtube.com, youtu.be, shorts ou live, ou l'identifiant de 11 caractères.";

// Les trois espaces qui affichent l'Académie : le catalogue membre, l'éditeur
// et la vue lecture "Moi" du fondateur. Cette dernière était oubliée partout,
// le fondateur y voyait donc un état périmé après chaque modification.
function revalidateAllFormations() {
  revalidatePath("/dashboard/client/formations", "layout");
  revalidatePath("/dashboard/coach/formations", "layout");
  revalidatePath("/dashboard/coach/moi/formations", "layout");
}

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabase>>;

// ── Qui peut éditer quoi (2026-09-30) ──────────────────────────────────────
// Chaque coach crée et édite SES formations (owner_id = lui) ; l'Académie EP
// (owner_id null) reste réservée au fondateur. La RLS applique la même règle
// (can_edit_formation, migration 20260930b) : double protection.

type Admin = ReturnType<typeof createAdminClient>;

async function formationIdOf(admin: Admin, t: { formationId?: string; moduleId?: string; sectionId?: string; lessonId?: string }): Promise<string | null> {
  if (t.formationId) return t.formationId;
  let sectionId = t.sectionId;
  if (t.lessonId) {
    const { data } = await admin.from("formation_lessons").select("section_id").eq("id", t.lessonId).maybeSingle();
    sectionId = (data?.section_id as string | undefined) ?? undefined;
    if (!sectionId) return null;
  }
  let moduleId = t.moduleId;
  if (sectionId) {
    const { data } = await admin.from("formation_sections").select("module_id").eq("id", sectionId).maybeSingle();
    moduleId = (data?.module_id as string | undefined) ?? undefined;
    if (!moduleId) return null;
  }
  if (!moduleId) return null;
  const { data } = await admin.from("formation_modules").select("formation_id").eq("id", moduleId).maybeSingle();
  return (data?.formation_id as string | undefined) ?? null;
}

async function canEdit(admin: Admin, userId: string, formationId: string): Promise<boolean> {
  const [{ data: f }, { data: me }] = await Promise.all([
    admin.from("formations").select("owner_id").eq("id", formationId).maybeSingle(),
    admin.from("profiles").select("is_platform_owner").eq("id", userId).maybeSingle(),
  ]);
  if (!f) return false;
  return f.owner_id ? f.owner_id === userId : me?.is_platform_owner === true;
}

async function requireEditor(t: { formationId?: string; moduleId?: string; sectionId?: string; lessonId?: string }): Promise<{ ok: true; userId: string; formationId: string } | { ok: false; error: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return guard;
  const admin = createAdminClient();
  const formationId = await formationIdOf(admin, t);
  if (!formationId || !(await canEdit(admin, guard.userId, formationId))) return { ok: false, error: "Tu ne peux modifier que tes propres formations." };
  return { ok: true, userId: guard.userId, formationId };
}

function cleanTitle(title: string): string | null {
  const trimmed = typeof title === "string" ? title.trim() : "";
  return trimmed ? trimmed.slice(0, 200) : null;
}

function validDuration(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 300) return null;
  return n;
}

// ── Notification "nouvelle formation" ───────────────────────────────────────
// Ne part que lorsqu'il y a vraiment quelque chose à regarder : formation
// publiée ET au moins une leçon publiée avec vidéo. Avant, le simple passage
// de la formation en "Publiée" notifiait tous les membres, même avec 0 vidéo.

async function countPublishedLessons(supabase: ServerSupabase, formationId: string): Promise<number> {
  const { data: modules } = await supabase
    .from("formation_modules")
    .select("id, formation_sections(id)")
    .eq("formation_id", formationId);
  const sectionIds = ((modules ?? []) as { formation_sections: { id: string }[] | null }[]).flatMap((m) =>
    (m.formation_sections ?? []).map((s) => s.id)
  );
  if (sectionIds.length === 0) return 0;
  const { count } = await supabase
    .from("formation_lessons")
    .select("id", { count: "exact", head: true })
    .in("section_id", sectionIds)
    .eq("is_published", true)
    .not("youtube_id", "is", null);
  return count ?? 0;
}

async function formationIdForSection(supabase: ServerSupabase, sectionId: string): Promise<string | null> {
  const { data: section } = await supabase
    .from("formation_sections")
    .select("module_id")
    .eq("id", sectionId)
    .maybeSingle();
  if (!section) return null;
  const { data: mod } = await supabase
    .from("formation_modules")
    .select("formation_id")
    .eq("id", section.module_id)
    .maybeSingle();
  return (mod?.formation_id as string | undefined) ?? null;
}

async function formationIdForLesson(supabase: ServerSupabase, lessonId: string): Promise<string | null> {
  const { data: lesson } = await supabase
    .from("formation_lessons")
    .select("section_id")
    .eq("id", lessonId)
    .maybeSingle();
  return lesson ? formationIdForSection(supabase, lesson.section_id as string) : null;
}

// Photo avant écriture : null si la formation est en brouillon (jamais de
// notification dans ce cas), sinon le nombre de leçons déjà visibles.
async function publishedSnapshot(
  supabase: ServerSupabase,
  formationId: string | null
): Promise<{ formationId: string; count: number } | null> {
  if (!formationId) return null;
  const { data } = await supabase.from("formations").select("is_published").eq("id", formationId).maybeSingle();
  if (data?.is_published !== true) return null;
  return { formationId, count: await countPublishedLessons(supabase, formationId) };
}

// Après écriture : si la formation publiée passe de 0 à au moins 1 vidéo
// visible, c'est ce moment-là (et lui seul) qui mérite la notification.
async function maybeNotifyFirstVideo(
  supabase: ServerSupabase,
  before: { formationId: string; count: number } | null
): Promise<void> {
  if (!before || before.count > 0) return;
  try {
    const after = await countPublishedLessons(supabase, before.formationId);
    if (after > 0) await notifyNewFormationPublished(before.formationId);
  } catch (e) {
    // Jamais bloquant : l'enregistrement a réussi, seule l'annonce a échoué.
    console.error("maybeNotifyFirstVideo error:", e);
  }
}

async function notifyNewFormationPublished(formationId: string, titleOverride?: string): Promise<void> {
  const admin = createAdminClient();
  let title = titleOverride;
  if (!title) {
    const { data: formation } = await admin.from("formations").select("title").eq("id", formationId).maybeSingle();
    title = formation?.title ?? "Une nouvelle formation";
  }

  // Formation d'un coach : seuls ses clients sont prévenus. Académie EP :
  // tous les membres.
  const { data: f } = await admin.from("formations").select("owner_id").eq("id", formationId).maybeSingle();
  let q = admin.from("profiles").select("id").eq("role", "client");
  if (f?.owner_id) q = q.eq("coach_id", f.owner_id as string);
  const { data: clients } = await q;
  const clientIds = (clients ?? []).map((c) => c.id as string);
  if (clientIds.length === 0) return;

  await notifyUsers(clientIds, {
    type: "new_formation_published",
    title: "🎓 Nouvelle formation disponible",
    body: f?.owner_id ? `« ${title} » vient d'être publiée par ton coach.` : `« ${title} » vient d'être publiée dans l'Académie EP.`,
    url: `/dashboard/client/formations/${formationId}`,
  });
}

// ── Leçon : vidéo et publication ────────────────────────────────────────────

export async function updateLessonYoutube(lessonId: string, youtubeInput: string, isPublished: boolean) {
  const guard = await requireEditor({ lessonId });
  if (!guard.ok) return { error: guard.error };
  const supabase = await createServerSupabase();

  // Avant : `extractYoutubeId(x) ?? x` stockait l'entrée brute quand elle
  // n'était pas reconnue (ex. une URL shorts/live), le lecteur membre
  // recevait alors un identifiant invalide sans que personne ne le voie.
  const raw = typeof youtubeInput === "string" ? youtubeInput.trim() : "";
  const id = raw ? extractYoutubeId(raw) : null;
  if (raw && !id) return { error: MSG_INVALID_URL };
  // Même règle que publishSectionLessons : une leçon publiée sans vidéo
  // casse son affichage membre. Et un import en masse qui remplirait plus
  // tard cette leçon (sans "Publier directement") la rendrait visible sans
  // que personne ne l'ait décidé, ni annonce aux membres.
  if (isPublished === true && !id) return { error: "Ajoute une vidéo avant de publier cette leçon." };

  const before = isPublished && id ? await publishedSnapshot(supabase, await formationIdForLesson(supabase, lessonId)) : null;

  const { error } = await supabase
    .from("formation_lessons")
    .update({ youtube_id: id, is_published: isPublished === true })
    .eq("id", lessonId);

  if (error) return { error: error.message };
  revalidateAllFormations();
  await maybeNotifyFirstVideo(supabase, before);
  return { success: true };
}

export async function updateFormation(formationId: string, data: {
  title?: string;
  subtitle?: string;
  description?: string;
  emoji?: string;
  is_published?: boolean;
  access_mode?: "inclus" | "payant";
  price_eur?: number | null;
  payment_url?: string | null;
}) {
  const guard = await requireEditor({ formationId });
  if (!guard.ok) return { error: guard.error };
  const supabase = await createServerSupabase();

  // Liste blanche : une server action reçoit ce que le navigateur envoie,
  // jamais d'autre colonne (slug, order_index...) ne doit passer par ici.
  const patch: Record<string, string | boolean | number | null> = {};
  if (data.access_mode === "inclus" || data.access_mode === "payant") patch.access_mode = data.access_mode;
  if (data.price_eur !== undefined) {
    const price = data.price_eur === null ? null : Number(data.price_eur);
    if (price !== null && (!Number.isFinite(price) || price < 0 || price > 100000)) return { error: "Prix invalide." };
    patch.price_eur = price;
  }
  if (data.payment_url !== undefined) {
    const url = typeof data.payment_url === "string" ? data.payment_url.trim() : "";
    if (url && !/^https:\/\//i.test(url)) return { error: "Le lien de paiement doit commencer par https://" };
    patch.payment_url = url ? url.slice(0, 500) : null;
  }
  if (data.title !== undefined) {
    const title = cleanTitle(data.title);
    if (!title) return { error: "Le titre ne peut pas être vide." };
    patch.title = title;
  }
  if (typeof data.subtitle === "string") patch.subtitle = data.subtitle.trim();
  if (typeof data.description === "string") patch.description = data.description.trim();
  if (typeof data.emoji === "string" && data.emoji.trim()) patch.emoji = data.emoji.trim().slice(0, 16);
  if (typeof data.is_published === "boolean") patch.is_published = data.is_published;
  if (Object.keys(patch).length === 0) return { success: true };

  // On regarde l'état avant update pour ne notifier que sur le vrai passage
  // brouillon → publiée, jamais sur une simple resauvegarde du titre.
  let wasUnpublished = false;
  if (patch.is_published === true) {
    const { data: current } = await supabase
      .from("formations")
      .select("is_published")
      .eq("id", formationId)
      .maybeSingle();
    wasUnpublished = current?.is_published !== true;
  }

  const { error } = await supabase
    .from("formations")
    .update(patch)
    .eq("id", formationId);

  if (error) return { error: error.message };
  revalidateAllFormations();

  // Publier une formation sans aucune vidéo visible ne notifie personne :
  // l'annonce partira d'elle-même à la première vidéo publiée
  // (maybeNotifyFirstVideo dans les actions de leçon).
  if (wasUnpublished) {
    try {
      if ((await countPublishedLessons(supabase, formationId)) > 0) {
        await notifyNewFormationPublished(formationId, typeof patch.title === "string" ? patch.title : undefined);
      }
    } catch (e) {
      console.error("updateFormation notify error:", e);
    }
  }

  return { success: true };
}

export async function updateModuleTitle(moduleId: string, title: string) {
  const guard = await requireEditor({ moduleId });
  if (!guard.ok) return { error: guard.error };
  const clean = cleanTitle(title);
  if (!clean) return { error: "Le titre ne peut pas être vide." };
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("formation_modules")
    .update({ title: clean })
    .eq("id", moduleId);

  if (error) return { error: error.message };
  revalidateAllFormations();
  return { success: true };
}

export async function updateSectionTitle(sectionId: string, title: string) {
  const guard = await requireEditor({ sectionId });
  if (!guard.ok) return { error: guard.error };
  const clean = cleanTitle(title);
  if (!clean) return { error: "Le titre ne peut pas être vide." };
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("formation_sections")
    .update({ title: clean })
    .eq("id", sectionId);

  if (error) return { error: error.message };
  revalidateAllFormations();
  return { success: true };
}

export async function updateLessonTitle(lessonId: string, title: string) {
  const guard = await requireEditor({ lessonId });
  if (!guard.ok) return { error: guard.error };
  const clean = cleanTitle(title);
  if (!clean) return { error: "Le titre ne peut pas être vide." };
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("formation_lessons")
    .update({ title: clean })
    .eq("id", lessonId);

  if (error) return { error: error.message };
  revalidateAllFormations();
  return { success: true };
}

// ── Réorganisation ───────────────────────────────────────────────────────────
// Jusqu'ici impossible de changer l'ordre après coup (seulement ajouter en
// fin de liste) : avec 148 leçons déjà créées sur 5 formations, corriger
// l'ordre d'une section obligeait à tout supprimer et recréer. Échange de
// order_index avec le voisin immédiat, même principe que moveDay/moveExercise
// dans ProgramEditor.

async function swapOrder(
  supabase: ServerSupabase,
  table: "formation_modules" | "formation_sections" | "formation_lessons",
  rows: { id: string; order_index: number }[],
  id: string,
  direction: "up" | "down"
): Promise<{ error?: string }> {
  const idx = rows.findIndex((r) => r.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= rows.length) return {};

  const a = rows[idx];
  const b = rows[swapIdx];
  const first = await supabase.from(table).update({ order_index: b.order_index }).eq("id", a.id);
  if (first.error) return { error: first.error.message };
  const second = await supabase.from(table).update({ order_index: a.order_index }).eq("id", b.id);
  if (second.error) return { error: second.error.message };
  return {};
}

export async function moveModule(formationId: string, moduleId: string, direction: "up" | "down") {
  const guard = await requireEditor({ formationId });
  if (!guard.ok) return { error: guard.error };
  const supabase = await createServerSupabase();

  const { data: modules } = await supabase
    .from("formation_modules")
    .select("id, order_index")
    .eq("formation_id", formationId)
    .order("order_index");
  if (!modules) return { error: "Erreur de lecture, réessaie." };

  const res = await swapOrder(supabase, "formation_modules", modules, moduleId, direction);
  if (res.error) return { error: res.error };
  revalidateAllFormations();
  return { success: true };
}

export async function moveSection(moduleId: string, sectionId: string, direction: "up" | "down") {
  const guard = await requireEditor({ moduleId });
  if (!guard.ok) return { error: guard.error };
  const supabase = await createServerSupabase();

  const { data: sections } = await supabase
    .from("formation_sections")
    .select("id, order_index")
    .eq("module_id", moduleId)
    .order("order_index");
  if (!sections) return { error: "Erreur de lecture, réessaie." };

  const res = await swapOrder(supabase, "formation_sections", sections, sectionId, direction);
  if (res.error) return { error: res.error };
  revalidateAllFormations();
  return { success: true };
}

export async function moveLesson(sectionId: string, lessonId: string, direction: "up" | "down") {
  const guard = await requireEditor({ sectionId });
  if (!guard.ok) return { error: guard.error };
  const supabase = await createServerSupabase();

  const { data: lessons } = await supabase
    .from("formation_lessons")
    .select("id, order_index")
    .eq("section_id", sectionId)
    .order("order_index");
  if (!lessons) return { error: "Erreur de lecture, réessaie." };

  const res = await swapOrder(supabase, "formation_lessons", lessons, lessonId, direction);
  if (res.error) return { error: res.error };
  revalidateAllFormations();
  return { success: true };
}

// ── Détail de leçon ──────────────────────────────────────────────────────────
// description et duration_min existent en base depuis le début mais n'étaient
// éditables nulle part dans l'UI (duration_min restait figé à 10, la valeur
// par défaut de la création), pourtant affichés côté membre (VideoPlayer,
// listes de leçons).

export async function updateLessonDetails(
  lessonId: string,
  data: { description?: string; duration_min?: number }
) {
  const guard = await requireEditor({ lessonId });
  if (!guard.ok) return { error: guard.error };

  const patch: { description?: string; duration_min?: number } = {};
  if (typeof data.description === "string") patch.description = data.description.trim();
  if (data.duration_min !== undefined) {
    const duration = validDuration(data.duration_min);
    if (duration === null) return { error: "Durée invalide (entre 1 et 300 minutes)." };
    patch.duration_min = duration;
  }
  if (Object.keys(patch).length === 0) return { success: true };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("formation_lessons").update(patch).eq("id", lessonId);

  if (error) return { error: error.message };
  revalidateAllFormations();
  return { success: true };
}

// ── Publication en masse ─────────────────────────────────────────────────────
// Avec 148 leçons déjà créées et 0 publiées, publier une par une n'est pas
// réaliste : permet de publier (ou masquer) d'un coup toutes les leçons d'un
// module qui ont déjà une vidéo YouTube renseignée (jamais celles qui n'en
// ont pas : publier une leçon sans vidéo casserait son affichage membre).
export async function publishSectionLessons(sectionId: string, publish: boolean) {
  const guard = await requireEditor({ sectionId });
  if (!guard.ok) return { error: guard.error };
  const supabase = await createServerSupabase();

  const before = publish ? await publishedSnapshot(supabase, await formationIdForSection(supabase, sectionId)) : null;

  let query = supabase.from("formation_lessons").update({ is_published: publish === true }).eq("section_id", sectionId);
  if (publish) query = query.not("youtube_id", "is", null);
  const { error } = await query;

  if (error) return { error: error.message };
  revalidateAllFormations();
  await maybeNotifyFirstVideo(supabase, before);
  return { success: true };
}

// ── Import de vidéos en masse ────────────────────────────────────────────────
// Remplir l'Académie leçon par leçon (ouvrir, coller l'URL, cocher Publier,
// enregistrer, corriger la durée) représentait plus de 100 manipulations
// rien que pour les 35 vidéos de F1. Le fondateur colle maintenant toutes
// les URL d'un module d'un coup (BulkVideoImport.tsx) : vérification oEmbed
// ici, détection des durées dans le navigateur, puis un seul enregistrement.

// oEmbed répond pour les vidéos publiques ET non répertoriées (le format
// probable des vidéos de formation), 401/403 pour une vidéo privée ou dont
// l'intégration est désactivée : exactement les vidéos qu'un membre ne
// pourra pas lire dans l'appli, à signaler avant publication.
async function fetchYoutubeOembed(id: string): Promise<YoutubePreview> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
      { signal: AbortSignal.timeout(5000), cache: "no-store" }
    );
    if (res.ok) {
      const json = (await res.json().catch(() => null)) as { title?: unknown } | null;
      return { id, status: "ok", title: typeof json?.title === "string" ? json.title : undefined };
    }
    const status: YoutubePreviewStatus =
      res.status === 401 || res.status === 403 ? "privee" : res.status === 404 || res.status === 400 ? "introuvable" : "inconnue";
    return { id, status };
  } catch {
    // Délai dépassé ou réseau : statut non vérifié, jamais bloquant.
    return { id, status: "inconnue" };
  }
}

export async function previewYoutubeVideos(
  ids: string[]
): Promise<{ error?: string; results?: YoutubePreview[] }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (!Array.isArray(ids)) return { error: "Liste de vidéos invalide." };

  const unique = [...new Set(ids.filter((id) => typeof id === "string" && isYoutubeId(id)))];
  if (unique.length === 0) return { results: [] };
  if (unique.length > MAX_YOUTUBE_LINES) return { error: `${MAX_YOUTUBE_LINES} vidéos maximum par collage.` };

  // 4 requêtes en parallèle au plus : assez rapide pour un module entier,
  // sans déclencher de limitation côté YouTube.
  const results: YoutubePreview[] = new Array(unique.length);
  let next = 0;
  async function worker() {
    while (next < unique.length) {
      const i = next++;
      results[i] = await fetchYoutubeOembed(unique[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, unique.length) }, worker));
  return { results };
}

export interface BulkLessonVideo {
  lessonId: string;
  youtubeId: string;
  /** Durée détectée par le lecteur YouTube, en minutes (1 à 300). */
  durationMin?: number | null;
  /** false quand oEmbed a signalé une vidéo privée : jamais publiée. */
  playable?: boolean;
}

export async function bulkAssignLessonVideos(
  sectionId: string,
  items: BulkLessonVideo[],
  publish: boolean
): Promise<{ error?: string; updated?: number }> {
  const guard = await requireEditor({ sectionId });
  if (!guard.ok) return { error: guard.error };
  if (!Array.isArray(items) || items.length === 0) return { error: "Aucune vidéo à enregistrer." };
  if (items.length > MAX_YOUTUBE_LINES) return { error: `${MAX_YOUTUBE_LINES} vidéos maximum par collage.` };

  const supabase = await createServerSupabase();

  // Chaque leçon visée doit appartenir à CE module : l'action reçoit des
  // identifiants venus du navigateur, jamais pris pour argent comptant.
  const { data: lessons, error: readError } = await supabase
    .from("formation_lessons")
    .select("id")
    .eq("section_id", sectionId);
  if (readError || !lessons) return { error: "Impossible de lire les leçons de ce module." };
  const allowed = new Set(lessons.map((l) => l.id as string));
  const seen = new Set<string>();
  for (const item of items) {
    if (!item || typeof item.lessonId !== "string" || !allowed.has(item.lessonId)) {
      return { error: "Une des leçons ne fait pas partie de ce module, recharge la page." };
    }
    if (seen.has(item.lessonId)) return { error: "Une même leçon reçoit deux vidéos." };
    seen.add(item.lessonId);
    if (typeof item.youtubeId !== "string" || !isYoutubeId(item.youtubeId)) return { error: MSG_INVALID_URL };
  }

  const before = publish ? await publishedSnapshot(supabase, await formationIdForSection(supabase, sectionId)) : null;

  let updated = 0;
  const failures: string[] = [];
  for (const item of items) {
    const patch: { youtube_id: string; is_published?: boolean; duration_min?: number } = {
      youtube_id: item.youtubeId,
    };
    // Publier directement : seulement si la vidéo est lisible. Sans la case,
    // on ne touche pas au statut d'une leçon déjà publiée, sauf pour masquer
    // une vidéo privée (illisible pour un membre).
    if (item.playable === false) patch.is_published = false;
    else if (publish) patch.is_published = true;
    const duration = item.durationMin == null ? null : validDuration(item.durationMin);
    if (duration !== null) patch.duration_min = duration;

    const { error } = await supabase
      .from("formation_lessons")
      .update(patch)
      .eq("id", item.lessonId)
      .eq("section_id", sectionId);
    if (error) failures.push(error.message);
    else updated++;
  }

  revalidateAllFormations();
  await maybeNotifyFirstVideo(supabase, before);

  if (failures.length > 0) {
    return {
      updated,
      error: `${failures.length} vidéo${failures.length > 1 ? "s" : ""} non enregistrée${failures.length > 1 ? "s" : ""} : ${failures[0]}`,
    };
  }
  return { updated };
}

// Recalcul des durées des leçons qui ont déjà une vidéo (toutes figées à 10
// min, la valeur de création) : durées détectées dans le navigateur par le
// lecteur YouTube, écrites ici en une fois.
export async function bulkUpdateLessonDurations(
  items: { lessonId: string; durationMin: number }[]
): Promise<{ error?: string; updated?: number }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (!Array.isArray(items) || items.length === 0) return { error: "Aucune durée à enregistrer." };
  if (items.length > 300) return { error: "Trop de leçons d'un coup." };
  // Toutes les leçons doivent appartenir à une formation que ce coach édite.
  {
    const admin = createAdminClient();
    const ids = [...new Set(items.map((i) => i?.lessonId).filter((id): id is string => typeof id === "string"))];
    const checked = new Map<string, boolean>();
    for (const id of ids) {
      const fid = await formationIdOf(admin, { lessonId: id });
      if (!fid) return { error: "Leçon introuvable." };
      if (!checked.has(fid)) checked.set(fid, await canEdit(admin, guard.userId, fid));
      if (!checked.get(fid)) return { error: "Tu ne peux modifier que tes propres formations." };
    }
  }

  const supabase = await createServerSupabase();
  let updated = 0;
  const failures: string[] = [];
  for (const item of items) {
    const duration = validDuration(item?.durationMin);
    if (typeof item?.lessonId !== "string" || duration === null) continue;
    const { error } = await supabase
      .from("formation_lessons")
      .update({ duration_min: duration })
      .eq("id", item.lessonId);
    if (error) failures.push(error.message);
    else updated++;
  }

  revalidateAllFormations();
  if (failures.length > 0) {
    return { updated, error: `${failures.length} durée${failures.length > 1 ? "s" : ""} non enregistrée${failures.length > 1 ? "s" : ""} : ${failures[0]}` };
  }
  return { updated };
}

// ── Duplication ──────────────────────────────────────────────────────────────
// Réutiliser la structure d'une section existante (mêmes titres de modules,
// mêmes leçons vides à remplir) plutôt que retaper "Introduction / Théorie /
// Pratique" à la main à chaque nouvelle section. Les vidéos elles-mêmes ne
// sont jamais copiées (youtube_id reste vide sur les leçons dupliquées), pas
// de contenu publié par erreur.
export async function duplicateModule(moduleId: string) {
  const guard = await requireEditor({ moduleId });
  if (!guard.ok) return { error: guard.error };
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

  let failed = 0;
  for (const sec of sections) {
    const { data: newSection, error: sectionError } = await supabase
      .from("formation_sections")
      .insert({ module_id: newModule.id, title: sec.title, order_index: sec.order_index })
      .select()
      .single();
    if (sectionError || !newSection) {
      failed++;
      continue;
    }

    const lessons = (sec.formation_lessons ?? []).sort((a, b) => a.order_index - b.order_index);
    if (lessons.length > 0) {
      const { error: lessonsError } = await supabase.from("formation_lessons").insert(
        lessons.map((l) => ({
          section_id: newSection.id,
          title: l.title,
          description: l.description,
          duration_min: l.duration_min,
          order_index: l.order_index,
          // youtube_id et is_published volontairement omis (vides par défaut)
        }))
      );
      if (lessonsError) failed++;
    }
  }

  revalidateAllFormations();
  if (failed > 0) return { error: `Copie incomplète : ${failed} module${failed > 1 ? "s" : ""} non copié${failed > 1 ? "s" : ""} entièrement.` };
  return { success: true };
}

// Terminologie : formation_modules = la "Section" affichée (S1, S2...),
// formation_sections = le "Module" affiché (M1, M2...) à l'intérieur.
export async function addModule(formationId: string, title: string, orderIndex: number) {
  const guard = await requireEditor({ formationId });
  if (!guard.ok) return { error: guard.error };
  const clean = cleanTitle(title);
  if (!clean) return { error: "Le titre ne peut pas être vide." };
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("formation_modules")
    .insert({ formation_id: formationId, title: clean, order_index: orderIndex });

  if (error) return { error: error.message };
  revalidateAllFormations();
  return { success: true };
}

export async function addSection(moduleId: string, title: string, orderIndex: number) {
  const guard = await requireEditor({ moduleId });
  if (!guard.ok) return { error: guard.error };
  const clean = cleanTitle(title);
  if (!clean) return { error: "Le titre ne peut pas être vide." };
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("formation_sections")
    .insert({ module_id: moduleId, title: clean, order_index: orderIndex });

  if (error) return { error: error.message };
  revalidateAllFormations();
  return { success: true };
}

export async function addLesson(sectionId: string, title: string, orderIndex: number) {
  const guard = await requireEditor({ sectionId });
  if (!guard.ok) return { error: guard.error };
  const clean = cleanTitle(title);
  if (!clean) return { error: "Le titre ne peut pas être vide." };
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("formation_lessons")
    .insert({ section_id: sectionId, title: clean, order_index: orderIndex, duration_min: 10 });

  if (error) return { error: error.message };
  revalidateAllFormations();
  return { success: true };
}

// Suppressions : les modules/leçons enfants sont détruits automatiquement
// par les ON DELETE CASCADE côté DB (voir supabase/migrations/add_formation_sections.sql).
export async function deleteModule(moduleId: string) {
  const guard = await requireEditor({ moduleId });
  if (!guard.ok) return { error: guard.error };
  const supabase = await createServerSupabase();

  const { error } = await supabase.from("formation_modules").delete().eq("id", moduleId);

  if (error) return { error: error.message };
  revalidateAllFormations();
  return { success: true };
}

export async function deleteSection(sectionId: string) {
  const guard = await requireEditor({ sectionId });
  if (!guard.ok) return { error: guard.error };
  const supabase = await createServerSupabase();

  const { error } = await supabase.from("formation_sections").delete().eq("id", sectionId);

  if (error) return { error: error.message };
  revalidateAllFormations();
  return { success: true };
}

export async function deleteLesson(lessonId: string) {
  const guard = await requireEditor({ lessonId });
  if (!guard.ok) return { error: guard.error };
  const supabase = await createServerSupabase();

  const { error } = await supabase.from("formation_lessons").delete().eq("id", lessonId);

  if (error) return { error: error.message };
  revalidateAllFormations();
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
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  const clean = cleanTitle(title);
  if (!clean) return { error: "Le titre ne peut pas être vide." };
  const supabase = await createServerSupabase();

  // Le fondateur crée dans l'Académie EP, tout autre coach crée SA formation.
  const admin = createAdminClient();
  const { data: me } = await admin.from("profiles").select("is_platform_owner").eq("id", guard.userId).maybeSingle();
  const ownerId = me?.is_platform_owner === true ? null : guard.userId;
  let countQuery = supabase.from("formations").select("id", { count: "exact", head: true });
  countQuery = ownerId ? countQuery.eq("owner_id", ownerId) : countQuery.is("owner_id", null);
  const { count } = await countQuery;

  const { data, error } = await supabase
    .from("formations")
    .insert({
      owner_id: ownerId,
      title: clean,
      slug: `${slugify(clean)}-${Date.now().toString(36)}`,
      emoji: (typeof emoji === "string" && emoji.trim().slice(0, 16)) || "📚",
      color: "#E01E1E",
      order_index: count ?? 0,
      is_published: false,
    })
    .select()
    .single();

  if (error || !data) return { error: error?.message ?? "Erreur lors de la création." };
  revalidateAllFormations();
  return { id: data.id };
}

export async function deleteFormation(formationId: string) {
  const guard = await requireEditor({ formationId });
  if (!guard.ok) return { error: guard.error };
  const supabase = await createServerSupabase();

  const { error } = await supabase.from("formations").delete().eq("id", formationId);

  if (error) return { error: error.message };
  revalidateAllFormations();
  return { success: true };
}
