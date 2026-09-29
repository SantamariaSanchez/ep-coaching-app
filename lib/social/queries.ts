import { createAdminClient } from "@/lib/supabase-admin";
import { todayInParis } from "@/lib/dates";
import { PLATFORM_LABELS, configFor, type Platform } from "@/lib/social/platforms";

// Lectures du tableau de bord Stats réseaux (service role, appelées
// uniquement après vérification du propriétaire dans la page).

export interface AccountOverview {
  id: string;
  platform: Platform;
  name: string;
  followers: number | null;
  followersDate: string | null;
  growth: { d7: number | null; d30: number | null; d90: number | null };
  period: { views: number; reach: number; impressions: number; engagements: number; likes: number; comments: number; shares: number };
  lastRun: { status: string; finished_at: string | null; started_at: string; error: string | null } | null;
  backfillDone: boolean;
  backfillUntil: string | null;
  notes: string[];
}

export interface SeriesPoint {
  date: string;
  [platform: string]: number | string | null;
}

export interface PostRow {
  id: string;
  platform: Platform;
  caption: string | null;
  post_type: string | null;
  published_at: string | null;
  url: string | null;
  thumbnail_url: string | null;
  views: number | null;
  reach: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  engagement_rate: number | null;
  completion_rate: number | null;
  avg_watch_seconds: number | null;
  new_followers: number | null;
  script_id: string | null;
  script_link_source: string | null;
  scriptTitle: string | null;
}

function shift(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface DailyRow {
  account_id: string;
  date: string;
  followers_total: number | null;
  followers_gained: number | null;
  followers_lost: number | null;
  views: number | null;
  reach: number | null;
  impressions: number | null;
  engagements: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
}

export async function getSocialDashboard(opts: { platform: Platform | null; days: number; sort: "vues" | "engagement" | "recent"; type: string | null }) {
  const admin = createAdminClient();
  const today = todayInParis();
  const since = shift(today, -Math.max(opts.days, 90));

  const [{ data: accounts, error: accErr }, { data: runs }] = await Promise.all([
    admin.from("social_accounts").select("id, platform, name, backfill_done, backfill_until").eq("active", true).order("platform"),
    admin.from("social_sync_runs").select("platform, status, started_at, finished_at, error, rows_written, trigger, details").order("started_at", { ascending: false }).limit(40),
  ]);
  // Tables absentes (migration pas encore exécutée) : le tableau de bord le dit.
  if (accErr) return { ready: false as const, error: accErr.message };

  const accs = (accounts ?? []) as { id: string; platform: Platform; name: string; backfill_done: boolean; backfill_until: string | null }[];
  const ids = accs.map((a) => a.id);
  const { data: daily } = ids.length
    ? await admin
        .from("social_account_daily")
        .select("account_id, date, followers_total, followers_gained, followers_lost, views, reach, impressions, engagements, likes, comments, shares")
        .in("account_id", ids)
        .gte("date", since)
        .order("date")
    : { data: [] };
  const rows = (daily ?? []) as DailyRow[];
  const runList = (runs ?? []) as { platform: string; status: string; started_at: string; finished_at: string | null; error: string | null; rows_written: number; trigger: string; details: Record<string, unknown> }[];

  const periodFrom = shift(today, -opts.days);
  const overview: AccountOverview[] = accs.map((a) => {
    const mine = rows.filter((r) => r.account_id === a.id);
    const withTotal = mine.filter((r) => r.followers_total !== null);
    const last = withTotal[withTotal.length - 1];
    const totalAt = (date: string) => {
      const before = withTotal.filter((r) => r.date <= date);
      return before.length ? Number(before[before.length - 1].followers_total) : null;
    };
    const growthFor = (n: number) => {
      if (last) {
        const past = totalAt(shift(last.date, -n));
        if (past !== null) return Number(last.followers_total) - past;
      }
      const win = mine.filter((r) => r.date > shift(today, -n));
      if (!win.some((r) => r.followers_gained !== null)) return null;
      return win.reduce((s, r) => s + Number(r.followers_gained ?? 0) - Number(r.followers_lost ?? 0), 0);
    };
    const inPeriod = mine.filter((r) => r.date >= periodFrom);
    const sum = (k: keyof DailyRow) => inPeriod.reduce((s, r) => s + Number(r[k] ?? 0), 0);
    const run = runList.find((r) => r.platform === a.platform) ?? null;
    return {
      id: a.id,
      platform: a.platform,
      name: a.name,
      followers: last ? Number(last.followers_total) : null,
      followersDate: last?.date ?? null,
      growth: { d7: growthFor(7), d30: growthFor(30), d90: growthFor(90) },
      period: { views: sum("views"), reach: sum("reach"), impressions: sum("impressions"), engagements: sum("engagements"), likes: sum("likes"), comments: sum("comments"), shares: sum("shares") },
      lastRun: run ? { status: run.status, finished_at: run.finished_at, started_at: run.started_at, error: run.error } : null,
      backfillDone: a.backfill_done,
      backfillUntil: a.backfill_until,
      notes: configFor(a.platform)?.notes ?? [],
    };
  });

  // Séries temporelles par plateforme (une colonne par plateforme).
  const platformOf = new Map(accs.map((a) => [a.id, a.platform]));
  const seriesMetric = (metric: keyof DailyRow): SeriesPoint[] => {
    const byDate = new Map<string, SeriesPoint>();
    for (const r of rows) {
      if (r.date < periodFrom) continue;
      const p = platformOf.get(r.account_id);
      if (!p || (opts.platform && p !== opts.platform)) continue;
      const pt = byDate.get(r.date) ?? { date: r.date };
      pt[p] = r[metric] === null ? null : Number(r[metric]);
      byDate.set(r.date, pt);
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  };
  const series = {
    followers: seriesMetric("followers_total"),
    views: seriesMetric("views"),
    reach: seriesMetric("reach"),
    engagements: seriesMetric("engagements"),
  };

  // Publications de la période.
  let pq = admin
    .from("social_posts")
    .select("id, platform, caption, post_type, published_at, url, thumbnail_url, views, reach, impressions, likes, comments, shares, saves, engagement_rate, completion_rate, avg_watch_seconds, new_followers, script_id, script_link_source")
    .gte("published_at", `${periodFrom}T00:00:00Z`);
  if (opts.platform) pq = pq.eq("platform", opts.platform);
  if (opts.type) pq = pq.eq("post_type", opts.type);
  pq = opts.sort === "recent" ? pq.order("published_at", { ascending: false }) : opts.sort === "engagement" ? pq.order("engagement_rate", { ascending: false, nullsFirst: false }) : pq.order("views", { ascending: false, nullsFirst: false });
  const { data: postData } = await pq.limit(60);
  const postsRaw = (postData ?? []) as Omit<PostRow, "scriptTitle">[];

  const { data: typeRows } = await admin.from("social_posts").select("post_type").not("post_type", "is", null).limit(1000);
  const types = [...new Set(((typeRows ?? []) as { post_type: string }[]).map((t) => t.post_type))].sort();

  const { data: owner } = await admin.from("profiles").select("id").eq("is_platform_owner", true).limit(1).maybeSingle();
  const { data: scripts } = owner?.id
    ? await admin.from("coach_scripts").select("id, title, status").eq("coach_id", owner.id).order("updated_at", { ascending: false }).limit(300)
    : { data: [] };
  const scriptList = (scripts ?? []) as { id: string; title: string; status: string }[];
  const scriptTitle = new Map(scriptList.map((s) => [s.id, s.title]));
  const posts: PostRow[] = postsRaw.map((p) => ({ ...p, scriptTitle: p.script_id ? scriptTitle.get(p.script_id) ?? null : null }));

  // Audience : dernier instantané de chaque dimension, par compte.
  const { data: aud } = ids.length
    ? await admin.from("social_audience_snapshots").select("account_id, snapshot_date, dimension, value, share, count").in("account_id", ids).gte("snapshot_date", shift(today, -60)).order("snapshot_date", { ascending: false }).limit(5000)
    : { data: [] };
  const audience: { platform: Platform; dimension: string; date: string; items: { value: string; share: number | null; count: number | null }[] }[] = [];
  for (const a of accs) {
    if (opts.platform && a.platform !== opts.platform) continue;
    const mine = ((aud ?? []) as { account_id: string; snapshot_date: string; dimension: string; value: string; share: number | null; count: number | null }[]).filter((r) => r.account_id === a.id);
    const dims = [...new Set(mine.map((r) => r.dimension))];
    for (const d of dims) {
      const latest = mine.filter((r) => r.dimension === d);
      const date = latest[0]?.snapshot_date;
      const items = latest
        .filter((r) => r.snapshot_date === date)
        .map((r) => ({ value: r.value, share: r.share === null ? null : Number(r.share), count: r.count === null ? null : Number(r.count) }))
        .sort((x, y) => (y.share ?? y.count ?? 0) - (x.share ?? x.count ?? 0))
        .slice(0, d === "heure" ? 24 : 8);
      audience.push({ platform: a.platform, dimension: d, date, items });
    }
  }

  const { data: recap } = await admin.from("social_weekly_recaps").select("week_start, markdown, notion_page_id, created_at").order("week_start", { ascending: false }).limit(1).maybeSingle();

  return {
    ready: true as const,
    overview,
    series,
    posts,
    types,
    scripts: scriptList,
    audience,
    runs: runList.slice(0, 12),
    recap: (recap as { week_start: string; markdown: string; notion_page_id: string | null; created_at: string } | null) ?? null,
    labels: PLATFORM_LABELS,
  };
}
