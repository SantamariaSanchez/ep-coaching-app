import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { todayInParis } from "@/lib/dates";
import { getContentFormat } from "@/lib/content-formats";
import { readAll, bestGroups, type PostNumbers, type PostReading, type GroupResult } from "@/lib/social/post-insights";
import type { Platform } from "@/lib/social/platforms";

// Données de la page « Ce qui marche » (stats réseaux refondues le
// 03/11/2026) : les publications du coach avec leurs chiffres, la lecture de
// chacune (lib/social/post-insights.ts) et les groupes qui marchent le mieux.

const COLS =
  "id, account_id, external_post_id, platform, caption, post_type, published_at, url, duration_seconds, views, reach, likes, comments, shares, saves, completion_rate, avg_watch_seconds, new_followers, script_id, extra";

export interface ReadPost extends PostNumbers {
  id: string;
  platform: Platform;
  caption: string | null;
  post_type: string | null;
  published_at: string | null;
  url: string | null;
  script_id: string | null;
  manual: boolean;
  scriptTitle: string | null;
  formatLabel: string | null;
  pillar: string | null;
  reading: PostReading;
}

export interface Readings {
  posts: ReadPost[];
  byFormat: GroupResult[];
  byType: GroupResult[];
  byPillar: GroupResult[];
  handles: Partial<Record<Platform, string>>;
  scripts: { id: string; title: string; platform: string | null }[];
}

const shift = (d: string, days: number) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + days);
  return x.toISOString().slice(0, 10);
};

export async function getReadings(ownerId: string): Promise<Readings> {
  const admin = createAdminClient();
  const { data: accounts } = await admin.from("social_accounts").select("id, platform, source, handle").eq("owner_id", ownerId);
  const accs = (accounts ?? []) as { id: string; platform: Platform; source: string; handle: string | null }[];
  const ids = accs.length ? accs.map((a) => a.id) : ["00000000-0000-0000-0000-000000000000"];
  const sourceOf = new Map(accs.map((a) => [a.id, a.source]));
  const handles: Partial<Record<Platform, string>> = {};
  for (const a of accs) if (a.handle && !handles[a.platform]) handles[a.platform] = a.handle;

  const [{ data: postRows }, { data: scriptRows }] = await Promise.all([
    admin.from("social_posts").select(COLS).in("account_id", ids).gte("published_at", `${shift(todayInParis(), -365)}T00:00:00Z`).order("published_at", { ascending: false }).limit(300),
    admin.from("coach_scripts").select("id, title, platform, content_format, pillar").eq("coach_id", ownerId).order("updated_at", { ascending: false }).limit(400),
  ]);
  const scripts = (scriptRows ?? []) as { id: string; title: string; platform: string | null; content_format: string | null; pillar: string | null }[];
  const byId = new Map(scripts.map((s) => [s.id, s]));

  type Raw = PostNumbers & { id: string; account_id: string; external_post_id: string; platform: Platform; caption: string | null; post_type: string | null; published_at: string | null; url: string | null; script_id: string | null; extra: unknown };
  // Seules les publications avec au moins une audience (vues ou portée) se comparent.
  const raws = ((postRows ?? []) as Raw[]).filter((p) => (p.views ?? p.reach) !== null);
  const read = readAll(raws);
  const posts: ReadPost[] = read.map(({ post: p, reading }) => {
    const sc = p.script_id ? byId.get(p.script_id) : undefined;
    const kept = (p.extra as { script?: { title?: string } } | null)?.script?.title ?? null;
    return {
      id: p.id,
      platform: p.platform,
      caption: p.caption,
      post_type: p.post_type,
      published_at: p.published_at,
      url: p.url,
      script_id: p.script_id,
      views: p.views,
      reach: p.reach,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      saves: p.saves,
      new_followers: p.new_followers,
      avg_watch_seconds: p.avg_watch_seconds,
      duration_seconds: p.duration_seconds,
      completion_rate: p.completion_rate,
      manual: sourceOf.get(p.account_id) === "manuel" || p.external_post_id.startsWith("manuel:"),
      scriptTitle: sc?.title ?? kept,
      formatLabel: sc ? getContentFormat(sc.content_format).label : null,
      pillar: sc?.pillar ?? null,
      reading,
    };
  });

  return {
    posts,
    byFormat: bestGroups(posts.map((p) => ({ key: p.formatLabel, reading: p.reading }))),
    byType: bestGroups(posts.map((p) => ({ key: p.post_type, reading: p.reading }))),
    byPillar: bestGroups(posts.map((p) => ({ key: p.pillar, reading: p.reading }))),
    handles,
    scripts: scripts.map((s) => ({ id: s.id, title: s.title, platform: s.platform })),
  };
}
