import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkVocabulary, usesVous } from "@/lib/content-vocabulary";
import { rewriteScriptWithVocabulary, spokenDuration, type RewriteOutput } from "@/lib/script-rewrite";

// Réécriture d'un script du Studio avec le vocabulaire du dictionnaire,
// partagée entre le Studio (un script à la fois, avec aperçu) et la
// correction automatique (cron script-autofix) : le fondateur ne veut pas
// avoir à cliquer sur un bouton pour que ses scripts restent dans son
// vocabulaire. L'ancienne version est toujours gardée dans previous_version.

type Admin = ReturnType<typeof createAdminClient>;

export type ScriptRewrite = RewriteOutput & { durationSeconds: number; sourceReference: string | null };

export interface ScriptRow {
  id: string;
  coach_id: string;
  title: string;
  hook: string | null;
  content: string | null;
  cta: string | null;
  instagram_caption: string | null;
  platform: string;
  duration_seconds: number | null;
  source_reference: string | null;
}

export const SCRIPT_COLUMNS =
  "id, coach_id, title, hook, content, cta, instagram_caption, platform, duration_seconds, source_reference";

/** Le script sort-il du vocabulaire (mots interdits, vouvoiement) ? */
export function scriptNeedsFix(s: Pick<ScriptRow, "title" | "hook" | "content" | "cta" | "instagram_caption">): boolean {
  const text = [s.title, s.hook, s.content, s.cta, s.instagram_caption].filter(Boolean).join("\n");
  return checkVocabulary(text).length > 0 || usesVous(s.content);
}

export async function resolveGuide(admin: Admin, sourceReference: string | null, cta: string | null) {
  const ref = (sourceReference ?? "").trim();
  const legacy = ref.match(/^lead_magnets:(\d+)\s+(\S+)/);
  const slug = legacy ? legacy[2] : ref;
  const numberHint = legacy?.[1] ?? cta?.match(/comment\w*\s+(\d{3,4})\b/i)?.[1] ?? null;
  type Guide = { slug: string; title: string; keyword: string | null };
  let guide: Guide | null = null;
  if (slug && /^[a-z0-9-]+$/.test(slug) && slug.includes("-")) {
    const { data } = await admin.from("lead_magnets").select("slug, title, keyword").eq("slug", slug).eq("published", true).maybeSingle();
    guide = (data as Guide | null) ?? null;
  }
  if (!guide && numberHint) {
    const { data } = await admin.from("lead_magnets").select("slug, title, keyword").eq("keyword", numberHint).eq("published", true).maybeSingle();
    guide = (data as Guide | null) ?? null;
  }
  return guide;
}

export async function saveRewrite(
  admin: Admin,
  coachId: string,
  previous: { title: string; hook: string | null; content: string | null; cta: string | null; instagram_caption: string | null },
  id: string,
  rewrite: ScriptRewrite
): Promise<string | null> {
  const patch: Record<string, unknown> = {
    title: rewrite.title,
    hook: rewrite.hook || null,
    content: rewrite.content,
    cta: rewrite.cta || null,
    instagram_caption: rewrite.caption || null,
    duration_seconds: rewrite.durationSeconds,
    updated_at: new Date().toISOString(),
  };
  if (rewrite.sourceReference) patch.source_reference = rewrite.sourceReference;
  const backup = {
    title: previous.title,
    hook: previous.hook,
    content: previous.content,
    cta: previous.cta,
    instagram_caption: previous.instagram_caption,
    saved_at: new Date().toISOString(),
  };
  let { error } = await admin.from("coach_scripts").update({ ...patch, previous_version: backup }).eq("id", id).eq("coach_id", coachId);
  if (error && /previous_version/.test(error.message)) {
    ({ error } = await admin.from("coach_scripts").update(patch).eq("id", id).eq("coach_id", coachId));
  }
  return error ? error.message : null;
}

/** Réécrit un script (sans l'enregistrer). */
export async function buildRewrite(admin: Admin, script: ScriptRow): Promise<{ rewrite?: ScriptRewrite; error?: string }> {
  if (!script.content?.trim()) return { error: "Ce script est vide." };
  const guide = await resolveGuide(admin, script.source_reference, script.cta);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";
  const { output, error } = await rewriteScriptWithVocabulary({
    platform: script.platform,
    title: script.title,
    hook: script.hook,
    content: script.content,
    cta: script.cta,
    caption: script.instagram_caption,
    durationSeconds: script.duration_seconds,
    guideKeyword: guide?.keyword ?? null,
    guideTitle: guide?.title ?? null,
    guideUrl: guide ? `${base}/ressources/${guide.slug}` : null,
  });
  if (!output) return { error: error ?? "La réécriture n'a pas abouti." };

  const isWritten = script.platform === "linkedin" || script.platform === "threads";
  return {
    rewrite: {
      ...output,
      caption: isWritten ? (script.instagram_caption ?? "") : output.caption,
      durationSeconds: isWritten ? (script.duration_seconds ?? 0) : spokenDuration(output.content, script.platform),
      // Les anciennes références « lead_magnets:123 slug » passent au format
      // actuel (le slug seul), celui que lit le suivi des leads par script.
      sourceReference: guide?.slug ?? null,
    },
  };
}

/**
 * Correction automatique : prend les scripts pas encore publiés qui sortent
 * du vocabulaire (les plus récents d'abord) et les réécrit, au plus `max`
 * par passage pour tenir dans la durée d'une fonction. Un script dont la
 * réécriture échoue est retenté au passage suivant ; un script déjà réécrit
 * une fois automatiquement n'est pas réécrit en boucle (on attend une
 * modification humaine).
 */
export async function runScriptAutofix(max = 3): Promise<{ fixed: string[]; failed: string[]; remaining: number }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("coach_scripts")
    .select(`${SCRIPT_COLUMNS}, status, previous_version`)
    .in("status", ["a_tourner", "tourne"])
    .order("created_at", { ascending: false })
    .limit(600);
  type Row = ScriptRow & { previous_version?: { auto?: boolean } | null };
  // Les posts écrits (LinkedIn, Threads) passent tous une fois par la
  // réécriture : ce sont les seuls formats lus mot pour mot, ils doivent être
  // entièrement dans le vocabulaire des transcripts, pas seulement sans mot banni.
  const isWritten = (s: Row) => s.platform === "linkedin" || s.platform === "threads";
  const flagged = ((data ?? []) as Row[]).filter(
    (s) => !s.previous_version?.auto && (scriptNeedsFix(s) || (isWritten(s) && !s.previous_version))
  );

  const fixed: string[] = [];
  const failed: string[] = [];
  for (const script of flagged.slice(0, max)) {
    const { rewrite, error } = await buildRewrite(admin, script).catch((e: unknown) => ({ rewrite: undefined, error: String(e) }));
    if (!rewrite) {
      failed.push(`${script.id}: ${error}`);
      continue;
    }
    const saveError = await saveRewrite(admin, script.coach_id, script, script.id, rewrite);
    if (saveError) {
      failed.push(`${script.id}: ${saveError}`);
      continue;
    }
    // Marque la sauvegarde comme automatique (évite de réécrire en boucle
    // un script que le détecteur signalerait encore).
    await admin
      .from("coach_scripts")
      .update({
        previous_version: {
          title: script.title,
          hook: script.hook,
          content: script.content,
          cta: script.cta,
          instagram_caption: script.instagram_caption,
          saved_at: new Date().toISOString(),
          auto: true,
        },
      })
      .eq("id", script.id);
    fixed.push(script.id);
  }
  return { fixed, failed, remaining: Math.max(0, flagged.length - fixed.length) };
}
