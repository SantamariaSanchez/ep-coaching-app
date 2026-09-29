import type { createAdminClient } from "@/lib/supabase-admin";
import { PLATFORM_LABELS, type Platform } from "@/lib/social/platforms";

// Récap hebdomadaire des réseaux (lundi après la synchro). Tout est calculé
// à partir des données en base : aucun chiffre inventé, et quand une donnée
// manque le récap le dit. Enregistré dans social_weekly_recaps, et écrit
// dans Notion quand NOTION_API_KEY et NOTION_STATS_DATABASE_ID existent.

type Admin = ReturnType<typeof createAdminClient>;

interface PostLite {
  id: string;
  platform: Platform;
  caption: string | null;
  published_at: string | null;
  url: string | null;
  views: number | null;
  impressions: number | null;
  reach: number | null;
  engagement_rate: number | null;
  completion_rate: number | null;
  script_id: string | null;
}

export interface WeeklyRecap {
  weekStart: string;
  weekEnd: string;
  followers: { platform: Platform; start: number | null; end: number | null; delta: number | null }[];
  totals: { platform: Platform; views: number; reach: number; engagements: number }[];
  top: { platform: Platform; caption: string; views: number; url: string | null }[];
  worst: { platform: Platform; caption: string; views: number; url: string | null } | null;
  bestHour: { hour: number; medianViews: number; posts: number } | null;
  recommendation: string;
  published: number;
}

function shift(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Lundi (heure de Paris) de la semaine qui contient `date`. */
export function mondayOf(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const dow = d.getUTCDay();
  return shift(date, dow === 0 ? -6 : 1 - dow);
}

const perf = (p: PostLite) => p.views ?? p.impressions ?? p.reach ?? 0;
const short = (s: string | null) => (s ?? "(sans légende)").replace(/\s+/g, " ").slice(0, 90);

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function parisDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
}

function parisHour(iso: string): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).format(new Date(iso)));
}

export async function buildWeeklyRecap(admin: Admin, weekStart: string): Promise<WeeklyRecap> {
  const weekEnd = shift(weekStart, 6);
  const { data: accounts } = await admin.from("social_accounts").select("id, platform").eq("active", true).eq("source", "windsor");
  const accs = (accounts ?? []) as { id: string; platform: Platform }[];

  const followers: WeeklyRecap["followers"] = [];
  const totals: WeeklyRecap["totals"] = [];
  for (const a of accs) {
    const { data: days } = await admin
      .from("social_account_daily")
      .select("date, followers_total, followers_gained, followers_lost, views, reach, impressions, engagements")
      .eq("account_id", a.id)
      .gte("date", shift(weekStart, -1))
      .lte("date", weekEnd)
      .order("date");
    const rows = (days ?? []) as { date: string; followers_total: number | null; followers_gained: number | null; followers_lost: number | null; views: number | null; reach: number | null; impressions: number | null; engagements: number | null }[];
    const withTotal = rows.filter((r) => r.followers_total !== null);
    const start = withTotal.find((r) => r.date < weekStart)?.followers_total ?? withTotal[0]?.followers_total ?? null;
    const end = withTotal[withTotal.length - 1]?.followers_total ?? null;
    const inWeek = rows.filter((r) => r.date >= weekStart);
    const netFromDaily = inWeek.some((r) => r.followers_gained !== null)
      ? inWeek.reduce((s, r) => s + Number(r.followers_gained ?? 0) - Number(r.followers_lost ?? 0), 0)
      : null;
    followers.push({ platform: a.platform, start, end, delta: start !== null && end !== null ? Number(end) - Number(start) : netFromDaily });
    totals.push({
      platform: a.platform,
      views: inWeek.reduce((s, r) => s + Number(r.views ?? r.impressions ?? 0), 0),
      reach: inWeek.reduce((s, r) => s + Number(r.reach ?? 0), 0),
      engagements: inWeek.reduce((s, r) => s + Number(r.engagements ?? 0), 0),
    });
  }

  const { data: weekPosts } = await admin
    .from("social_posts")
    .select("id, platform, caption, published_at, url, views, impressions, reach, engagement_rate, completion_rate, script_id")
    .in("account_id", accs.map((a) => a.id))
    .gte("published_at", `${shift(weekStart, -1)}T00:00:00Z`)
    .lte("published_at", `${shift(weekEnd, 1)}T23:59:59Z`);
  // Fenêtre élargie d'un jour puis filtre sur la date à Paris : exact quel
  // que soit le décalage horaire (été ou hiver).
  const posts = ((weekPosts ?? []) as PostLite[])
    .filter((p) => {
      if (!p.published_at) return false;
      const d = parisDate(p.published_at);
      return d >= weekStart && d <= weekEnd;
    })
    .sort((a, b) => perf(b) - perf(a));
  const top = posts.slice(0, 3).map((p) => ({ platform: p.platform, caption: short(p.caption), views: perf(p), url: p.url }));
  const worstP = posts.length > 1 ? posts[posts.length - 1] : null;
  const worst = worstP ? { platform: worstP.platform, caption: short(worstP.caption), views: perf(worstP), url: worstP.url } : null;

  // Meilleur horaire observé : médiane des vues par heure de publication
  // (heure de Paris) sur 90 jours, avec au moins 2 publications par créneau.
  const { data: recent } = await admin
    .from("social_posts")
    .select("published_at, views, impressions, reach")
    .in("account_id", accs.map((a) => a.id))
    .gte("published_at", `${shift(weekEnd, -90)}T00:00:00Z`)
    .not("published_at", "is", null);
  const byHour = new Map<number, number[]>();
  for (const p of (recent ?? []) as { published_at: string; views: number | null; impressions: number | null; reach: number | null }[]) {
    const h = parisHour(p.published_at);
    (byHour.get(h) ?? byHour.set(h, []).get(h)!).push(Number(p.views ?? p.impressions ?? p.reach ?? 0));
  }
  let bestHour: WeeklyRecap["bestHour"] = null;
  for (const [hour, vals] of byHour) {
    if (vals.length < 2) continue;
    const m = median(vals);
    if (!bestHour || m > bestHour.medianViews) bestHour = { hour, medianViews: Math.round(m), posts: vals.length };
  }

  // Recommandation : uniquement à partir de ce qui a été mesuré.
  const recs: string[] = [];
  if (posts.length === 0) {
    recs.push("Aucune publication détectée cette semaine : la régularité est la première variable à corriger, vise au moins 3 publications sur ta plateforme la plus forte.");
  } else {
    const best = posts[0];
    if (best.script_id) recs.push(`Réitère l'angle de ta meilleure publication (${PLATFORM_LABELS[best.platform]}, ${perf(best)} vues) : même accroche, un sujet voisin.`);
    else recs.push(`Ta meilleure publication de la semaine (${PLATFORM_LABELS[best.platform]}, ${perf(best)} vues) : « ${short(best.caption)} ». Décline cet angle.`);
    const tk = posts.filter((p) => p.platform === "tiktok" && p.completion_rate !== null);
    if (tk.length) {
      const avg = tk.reduce((s, p) => s + Number(p.completion_rate), 0) / tk.length;
      if (avg < 20) recs.push(`Sur TikTok, seulement ${Math.round(avg)} % des vues vont au bout en moyenne : resserre les 3 premières secondes et raccourcis.`);
    }
  }
  if (bestHour) recs.push(`Publie autour de ${bestHour.hour}h (heure de Paris) : c'est ton créneau le plus fort sur 90 jours (médiane ${bestHour.medianViews} vues, ${bestHour.posts} publications).`);
  const grow = [...followers].filter((f) => f.delta !== null).sort((a, b) => Number(b.delta) - Number(a.delta))[0];
  if (grow && Number(grow.delta) > 0) recs.push(`${PLATFORM_LABELS[grow.platform]} est la plateforme qui gagne le plus d'abonnés (+${grow.delta}) : priorise-la.`);

  return { weekStart, weekEnd, followers, totals, top, worst, bestHour, recommendation: recs.join(" "), published: posts.length };
}

export function recapMarkdown(r: WeeklyRecap): string {
  const fmt = (n: number | null) => (n === null ? "?" : n.toLocaleString("fr-FR"));
  const lines = [
    `Semaine du ${r.weekStart} au ${r.weekEnd}`,
    "",
    "Abonnés :",
    ...r.followers.map((f) => `- ${PLATFORM_LABELS[f.platform]} : ${fmt(f.end)} (${f.delta === null ? "évolution inconnue" : `${f.delta >= 0 ? "+" : ""}${f.delta}`})`),
    "",
    "Vues et portée :",
    ...r.totals.map((t) => `- ${PLATFORM_LABELS[t.platform]} : ${fmt(t.views)} vues, ${fmt(t.reach)} de portée, ${fmt(t.engagements)} engagements`),
    "",
    `Publications de la semaine : ${r.published}`,
    ...(r.top.length ? ["Top 3 :", ...r.top.map((p, i) => `${i + 1}. ${PLATFORM_LABELS[p.platform]}, ${fmt(p.views)} vues : ${p.caption}`)] : ["Aucune publication cette semaine."]),
    ...(r.worst ? [`Moins bonne : ${PLATFORM_LABELS[r.worst.platform]}, ${fmt(r.worst.views)} vues : ${r.worst.caption}`] : []),
    "",
    r.bestHour ? `Meilleur horaire observé : ${r.bestHour.hour}h (médiane ${fmt(r.bestHour.medianViews)} vues sur ${r.bestHour.posts} publications)` : "Meilleur horaire : pas encore assez de publications pour le dire.",
    "",
    `Recommandation : ${r.recommendation}`,
  ];
  return lines.join("\n");
}

// ── Notion (optionnel) ───────────────────────────────────────────────────

async function notion(path: string, init: RequestInit & { body?: string }) {
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.NOTION_API_KEY}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
    cache: "no-store",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Notion ${res.status} : ${(body as { message?: string } | null)?.message ?? "erreur"}`);
  return body as Record<string, unknown>;
}

export async function pushRecapToNotion(r: WeeklyRecap, markdown: string): Promise<string | null> {
  const db = process.env.NOTION_STATS_DATABASE_ID;
  if (!process.env.NOTION_API_KEY || !db) return null;
  const schema = await notion(`databases/${db}`, { method: "GET" });
  const props = (schema.properties ?? {}) as Record<string, { type: string }>;
  const titleProp = Object.entries(props).find(([, v]) => v.type === "title")?.[0] ?? "Name";
  const dateProp = Object.entries(props).find(([, v]) => v.type === "date")?.[0];
  const paragraphs = markdown.split("\n").filter(Boolean).map((line) => ({
    object: "block",
    type: line.startsWith("- ") || /^\d\. /.test(line) ? "bulleted_list_item" : "paragraph",
    [line.startsWith("- ") || /^\d\. /.test(line) ? "bulleted_list_item" : "paragraph"]: {
      rich_text: [{ type: "text", text: { content: line.replace(/^- /, "").slice(0, 1900) } }],
    },
  }));
  const page = await notion("pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: db },
      properties: {
        [titleProp]: { title: [{ type: "text", text: { content: `Stats réseaux, semaine du ${r.weekStart}` } }] },
        ...(dateProp ? { [dateProp]: { date: { start: r.weekStart, end: r.weekEnd } } } : {}),
      },
      children: paragraphs.slice(0, 95),
    }),
  });
  return (page.id as string) ?? null;
}

export async function saveWeeklyRecap(admin: Admin, weekStart: string): Promise<{ recap: WeeklyRecap; notionPageId: string | null; notionError: string | null }> {
  const recap = await buildWeeklyRecap(admin, weekStart);
  const markdown = recapMarkdown(recap);
  let notionPageId: string | null = null;
  let notionError: string | null = null;
  try {
    notionPageId = await pushRecapToNotion(recap, markdown);
  } catch (e) {
    notionError = e instanceof Error ? e.message : String(e);
  }
  await admin.from("social_weekly_recaps").upsert({ week_start: weekStart, content: recap, markdown, notion_page_id: notionPageId }, { onConflict: "week_start" });
  return { recap, notionPageId, notionError };
}
