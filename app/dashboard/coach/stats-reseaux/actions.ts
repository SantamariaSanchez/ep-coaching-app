"use server";

import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { todayInParis } from "@/lib/dates";
import { PLATFORM_LABELS, type Platform } from "@/lib/social/platforms";

// Stats réseaux de chaque coach (2026-09-29) : saisie de ses chiffres
// (abonnés, vues, portée...), de ses publications et de ses objectifs.
// Toujours sur SES comptes : l'appartenance est vérifiée à chaque appel,
// les écritures passent par la service role après cette vérification.

const PLATFORMS: Platform[] = ["instagram", "tiktok", "youtube", "facebook", "linkedin", "threads"];
const POST_TYPES = ["reel", "video", "short", "carrousel", "post", "story", "live", "texte"];
const PATHS = ["/dashboard/coach/stats-reseaux", "/dashboard/coach/admin/stats-reseaux"];

type Admin = ReturnType<typeof createAdminClient>;

function num(v: unknown, max = 1e12): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
}

function isPlatform(p: unknown): p is Platform {
  return typeof p === "string" && (PLATFORMS as string[]).includes(p);
}

function refresh() {
  for (const p of PATHS) revalidatePath(p);
}

/** Compte du coach sur une plateforme : l'existant (synchro ou manuel), sinon un compte manuel. */
async function accountFor(admin: Admin, ownerId: string, platform: Platform, handle?: string | null): Promise<{ id: string } | { error: string }> {
  const { data: existing } = await admin
    .from("social_accounts")
    .select("id, source, handle")
    .eq("owner_id", ownerId)
    .eq("platform", platform)
    .eq("active", true)
    .order("source", { ascending: false }) // 'windsor' avant 'manuel'
    .limit(1)
    .maybeSingle();
  if (existing) {
    const h = handle?.trim();
    if (h && h !== existing.handle) await admin.from("social_accounts").update({ handle: h.slice(0, 80) }).eq("id", existing.id);
    return { id: existing.id as string };
  }
  const h = handle?.trim().slice(0, 80) || null;
  const { data, error } = await admin
    .from("social_accounts")
    .insert({
      owner_id: ownerId,
      platform,
      source: "manuel",
      connector: "manuel",
      external_account_id: `manuel:${ownerId}`,
      name: h ?? PLATFORM_LABELS[platform],
      handle: h,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("accountFor insert error:", error);
    return { error: "Compte impossible à créer pour le moment." };
  }
  return { id: data.id as string };
}

export interface AccountEntryInput {
  platform: string;
  date: string;
  /** Période couverte par les chiffres saisis : 1, 7 ou 30 jours. */
  periodDays: number;
  handle?: string | null;
  followers?: number | string | null;
  views?: number | string | null;
  reach?: number | string | null;
  impressions?: number | string | null;
  profileViews?: number | string | null;
  clicks?: number | string | null;
  likes?: number | string | null;
  comments?: number | string | null;
  shares?: number | string | null;
  saves?: number | string | null;
  watchMinutes?: number | string | null;
}

export async function saveAccountEntryAction(input: AccountEntryInput): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (!isPlatform(input.platform)) return { error: "Plateforme invalide." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || input.date > todayInParis()) return { error: "Date invalide." };
  const period = [1, 7, 30].includes(input.periodDays) ? input.periodDays : 7;

  const values = {
    followers_total: num(input.followers),
    views: num(input.views),
    reach: num(input.reach),
    impressions: num(input.impressions),
    profile_views: num(input.profileViews),
    clicks: num(input.clicks),
    likes: num(input.likes),
    comments: num(input.comments),
    shares: num(input.shares),
  };
  const saves = num(input.saves);
  const watchMin = num(input.watchMinutes);
  if (Object.values(values).every((v) => v === null) && saves === null && watchMin === null) return { error: "Renseigne au moins un chiffre." };

  const admin = createAdminClient();
  const acc = await accountFor(admin, guard.userId, input.platform, input.handle);
  if ("error" in acc) return acc;

  const engagements = [values.likes, values.comments, values.shares, saves].some((v) => v !== null)
    ? (values.likes ?? 0) + (values.comments ?? 0) + (values.shares ?? 0) + (saves ?? 0)
    : null;
  // Abonnés gagnés : écart avec la dernière valeur connue avant cette date.
  let gained: number | null = null;
  if (values.followers_total !== null) {
    const { data: prev } = await admin
      .from("social_account_daily")
      .select("followers_total")
      .eq("account_id", acc.id)
      .lt("date", input.date)
      .not("followers_total", "is", null)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prev?.followers_total != null) gained = values.followers_total - Number(prev.followers_total);
  }

  const { error } = await admin.from("social_account_daily").upsert(
    {
      account_id: acc.id,
      date: input.date,
      ...values,
      engagements,
      followers_gained: gained !== null && gained > 0 ? gained : gained === null ? null : 0,
      followers_lost: gained !== null && gained < 0 ? -gained : gained === null ? null : 0,
      watch_time_seconds: watchMin !== null ? watchMin * 60 : null,
      extra: { manuel: true, periode_jours: period, ...(saves !== null ? { saves } : {}) },
      synced_at: new Date().toISOString(),
    },
    { onConflict: "account_id,date" }
  );
  if (error) {
    console.error("saveAccountEntryAction error:", error);
    return { error: "Enregistrement impossible pour le moment." };
  }
  refresh();
  return {};
}

export async function saveGoalAction(input: { platform: string; goalFollowers: number | string | null; goalDate: string | null; handle?: string | null }): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (!isPlatform(input.platform)) return { error: "Plateforme invalide." };
  const goal = num(input.goalFollowers, 1e10);
  const date = input.goalDate && /^\d{4}-\d{2}-\d{2}$/.test(input.goalDate) ? input.goalDate : null;
  const admin = createAdminClient();
  const acc = await accountFor(admin, guard.userId, input.platform, input.handle);
  if ("error" in acc) return acc;
  const { error } = await admin.from("social_accounts").update({ goal_followers: goal, goal_date: goal ? date : null }).eq("id", acc.id);
  if (error) return { error: "Objectif impossible à enregistrer." };
  refresh();
  return {};
}

export interface PostInput {
  id?: string | null;
  platform: string;
  publishedAt: string; // "YYYY-MM-DDTHH:mm", heure de Paris
  url?: string | null;
  postType?: string | null;
  caption?: string | null;
  scriptId?: string | null;
  durationSeconds?: number | string | null;
  views?: number | string | null;
  reach?: number | string | null;
  impressions?: number | string | null;
  likes?: number | string | null;
  comments?: number | string | null;
  shares?: number | string | null;
  saves?: number | string | null;
  newFollowers?: number | string | null;
  avgWatchSeconds?: number | string | null;
  completionRate?: number | string | null;
}

/** "2026-09-29T18:30" (heure de Paris) -> ISO UTC. */
function parisToIso(local: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const asUtc = new Date(`${m[1]}T${m[2]}:${m[3]}:00Z`);
  const parisHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).format(asUtc));
  let offset = parisHour - asUtc.getUTCHours();
  if (offset > 12) offset -= 24;
  if (offset < -12) offset += 24;
  return new Date(asUtc.getTime() - offset * 3600_000).toISOString();
}

export async function savePostAction(input: PostInput): Promise<{ error?: string; id?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  if (!isPlatform(input.platform)) return { error: "Plateforme invalide." };
  const publishedAt = parisToIso(input.publishedAt);
  if (!publishedAt) return { error: "Date de publication invalide." };
  const url = input.url?.trim() || null;
  if (url && !/^https?:\/\//i.test(url)) return { error: "Le lien doit commencer par https://" };
  const postType = input.postType && POST_TYPES.includes(input.postType) ? input.postType : null;

  const admin = createAdminClient();
  if (input.scriptId) {
    const { data: script } = await admin.from("coach_scripts").select("id").eq("id", input.scriptId).eq("coach_id", guard.userId).maybeSingle();
    if (!script) return { error: "Script introuvable." };
  }

  const m = {
    views: num(input.views),
    reach: num(input.reach),
    impressions: num(input.impressions),
    likes: num(input.likes),
    comments: num(input.comments),
    shares: num(input.shares),
    saves: num(input.saves),
    new_followers: num(input.newFollowers),
    avg_watch_seconds: num(input.avgWatchSeconds, 100000),
    completion_rate: num(input.completionRate, 100),
  };
  const base = m.reach ?? m.views ?? m.impressions;
  const inter = [m.likes, m.comments, m.shares, m.saves].some((v) => v !== null) ? (m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0) + (m.saves ?? 0) : null;
  const engagement_rate = base && inter !== null ? Math.round((inter / base) * 1000) / 10 : null;

  const fields = {
    platform: input.platform,
    caption: input.caption?.trim().slice(0, 2000) || null,
    post_type: postType,
    published_at: publishedAt,
    url,
    duration_seconds: num(input.durationSeconds, 100000),
    script_id: input.scriptId || null,
    // Toujours "manuel" : le rapprochement automatique ne touche jamais
    // aux publications saisies par le coach.
    script_link_source: "manuel",
    ...m,
    engagement_rate,
    last_synced_at: new Date().toISOString(),
  };

  let postId = input.id ?? null;
  if (postId) {
    const { data: own } = await admin
      .from("social_posts")
      .select("id, account_id, external_post_id, social_accounts!inner(owner_id)")
      .eq("id", postId)
      .eq("social_accounts.owner_id", guard.userId)
      .maybeSingle();
    if (!own || !String(own.external_post_id).startsWith("manuel:")) return { error: "Publication introuvable." };
    const acc = await accountFor(admin, guard.userId, input.platform);
    if ("error" in acc) return acc;
    const { error } = await admin.from("social_posts").update({ ...fields, account_id: acc.id }).eq("id", postId);
    if (error) {
      console.error("savePostAction update error:", error);
      return { error: "Modification impossible pour le moment." };
    }
  } else {
    const acc = await accountFor(admin, guard.userId, input.platform);
    if ("error" in acc) return acc;
    const { data, error } = await admin
      .from("social_posts")
      .insert({ ...fields, account_id: acc.id, external_post_id: `manuel:${crypto.randomUUID()}` })
      .select("id")
      .single();
    if (error || !data) {
      console.error("savePostAction insert error:", error);
      return { error: "Ajout impossible pour le moment." };
    }
    postId = data.id as string;
    // Script lié : il est forcément publié.
    if (input.scriptId) await admin.from("coach_scripts").update({ status: "publie" }).eq("id", input.scriptId).eq("coach_id", guard.userId).neq("status", "publie");
  }

  // Instantané du jour : garde l'évolution des chiffres d'une publication.
  await admin.from("social_post_metrics").upsert(
    { post_id: postId, snapshot_date: todayInParis(), ...m, engagement_rate, extra: { manuel: true } },
    { onConflict: "post_id,snapshot_date" }
  );
  refresh();
  return { id: postId };
}

export async function deletePostAction(postId: string): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  const admin = createAdminClient();
  const { data: own } = await admin
    .from("social_posts")
    .select("id, external_post_id, social_accounts!inner(owner_id)")
    .eq("id", postId)
    .eq("social_accounts.owner_id", guard.userId)
    .maybeSingle();
  // Seules les publications saisies à la main se suppriment (les autres
  // reviendraient à la prochaine synchro).
  if (!own || !String(own.external_post_id).startsWith("manuel:")) return { error: "Publication introuvable." };
  const { error } = await admin.from("social_posts").delete().eq("id", postId);
  if (error) return { error: "Suppression impossible pour le moment." };
  refresh();
  return {};
}

export async function linkPostToScriptAction(postId: string, scriptId: string | null): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };
  const admin = createAdminClient();
  const { data: own } = await admin
    .from("social_posts")
    .select("id, social_accounts!inner(owner_id)")
    .eq("id", postId)
    .eq("social_accounts.owner_id", guard.userId)
    .maybeSingle();
  if (!own) return { error: "Publication introuvable." };
  if (scriptId) {
    const { data: script } = await admin.from("coach_scripts").select("id").eq("id", scriptId).eq("coach_id", guard.userId).maybeSingle();
    if (!script) return { error: "Script introuvable." };
  }
  // "manuel" même pour un retrait : le rapprochement automatique ne
  // reliera plus jamais cette publication de lui-même.
  const { error } = await admin.from("social_posts").update({ script_id: scriptId, script_link_source: "manuel" }).eq("id", postId);
  if (error) return { error: "Lien impossible pour le moment." };
  refresh();
  return {};
}
