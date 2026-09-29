import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";
import { todayInParis } from "@/lib/dates";
import { availableFields, clearFieldCache, explainError, pickFields, queryConnector, windsorConfigured, WindsorError, type WindsorRow } from "@/lib/social/windsor";
import { PLATFORM_LABELS, configFor, type DailyColumn, type Mapping, type Platform, type PlatformConfig, type PostColumn } from "@/lib/social/platforms";
import { linkPostsToScripts } from "@/lib/social/script-link";

// Moteur de synchro des stats réseaux (Windsor -> Supabase). Chaque
// plateforme est isolée : si LinkedIn plante, TikTok continue, et chaque
// échec est écrit dans social_sync_runs puis signalé au fondateur.
// Tous les écrits sont des upserts sur des clés uniques : relancer une
// synchro ne crée jamais de doublon.

type Admin = ReturnType<typeof createAdminClient>;

export interface SocialAccount {
  id: string;
  platform: Platform;
  connector: string;
  external_account_id: string;
  name: string;
  active: boolean;
  backfill_until: string | null;
  backfill_done: boolean;
}

export type SyncTrigger = "cron" | "manuel" | "backfill" | "script";

export interface AccountSyncResult {
  platform: Platform;
  account: string;
  status: "success" | "partial" | "error" | "skipped";
  rows: number;
  error?: string;
  errorKind?: string;
  details: Record<string, unknown>;
}

const BACKFILL_FLOOR = "2018-01-01";
const CHUNK_DAYS = 90;

function shift(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

/** Date/heure Windsor vers ISO (sans fuseau, Windsor renvoie de l'UTC). */
function toIso(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  if (/^\d{10}$/.test(s)) return new Date(Number(s) * 1000).toISOString();
  if (/^\d{13}$/.test(s)) return new Date(Number(s)).toISOString();
  const withT = s.includes("T") ? s : s.replace(" ", "T");
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(withT);
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(withT) ? `${withT}T12:00:00Z` : hasTz ? withT : `${withT}Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Durée "PT1M5S", "1:05" ou secondes, vers des secondes. */
function durationSeconds(v: unknown): number | null {
  const s = str(v);
  if (!s) return null;
  const iso = /^P(?:T)?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(s);
  if (iso && (iso[1] || iso[2] || iso[3])) return (Number(iso[1] ?? 0) * 3600) + (Number(iso[2] ?? 0) * 60) + Number(iso[3] ?? 0);
  const clock = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (clock) return clock[3] ? Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3]) : Number(clock[1]) * 60 + Number(clock[2]);
  return num(s);
}

function applyMappings<C extends string>(row: WindsorRow, mappings: Mapping<C>[], present: Set<string>): Partial<Record<C, number>> {
  const out: Partial<Record<C, number>> = {};
  for (const m of mappings) {
    if (!present.has(m.field)) continue;
    const n = num(row[m.field]);
    if (n === null) continue;
    out[m.column] = m.scale ? Math.round(n * m.scale * 1000) / 1000 : n;
  }
  return out;
}

async function upsertInBatches(admin: Admin, table: string, rows: Record<string, unknown>[], onConflict: string) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from(table).upsert(rows.slice(i, i + 500), { onConflict });
    if (error) throw new Error(`${table} : ${error.message}`);
  }
}

// ── Rapports ─────────────────────────────────────────────────────────────

interface Ctx {
  admin: Admin;
  account: SocialAccount;
  cfg: PlatformConfig;
  available: Set<string> | null;
  missing: Record<string, string[]>;
  counts: Record<string, number>;
  warnings: string[];
}

async function syncDaily(ctx: Ctx, from: string, to: string): Promise<number> {
  const { cfg, account } = ctx;
  if (!cfg.daily) return 0;
  const wanted = ["date", ...cfg.daily.mappings.map((m) => m.field), ...cfg.daily.extras];
  const { fields, missing } = pickFields(wanted, ctx.available);
  if (missing.length) ctx.missing.daily = missing;
  if (!fields.includes("date") || fields.length < 2) return 0;
  const present = new Set(fields);
  const rows = await queryConnector(cfg.connector, { fields, dateFrom: from, dateTo: to, accountId: accountFilter(account) });

  const byDate = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const date = str(r.date)?.slice(0, 10);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const cols = applyMappings<DailyColumn>(r, cfg.daily.mappings, present);
    const prev = byDate.get(date);
    if (prev) {
      // Plusieurs lignes pour un même jour : on garde la plus grande valeur
      // de chaque métrique (jamais d'addition qui doublerait un total).
      for (const [k, v] of Object.entries(cols)) prev[k] = Math.max(Number(prev[k] ?? 0), v as number);
      (prev.extra as Record<string, unknown>[]).push(r);
    } else {
      byDate.set(date, { account_id: account.id, date, ...cols, extra: [r], synced_at: new Date().toISOString() });
    }
  }
  const out: Record<string, unknown>[] = [...byDate.values()].map((row) => {
    const extras = row.extra as WindsorRow[];
    return { ...row, extra: extras.length === 1 ? extras[0] : { rows: extras } };
  });

  // YouTube, Instagram : le total d'abonnés n'existe qu'au jour de la
  // synchro, on reconstitue l'historique avec les gains et pertes du jour.
  if (cfg.currentTotalField && out.length) {
    const totalField = cfg.currentTotalField;
    const { fields: f2 } = pickFields([totalField], ctx.available);
    if (f2.length) {
      try {
        const cur = await queryConnector(cfg.connector, { fields: f2, accountId: accountFilter(account), maxRows: 5 });
        let total = num(cur[0]?.[totalField]);
        if (total !== null) {
          const sorted = [...out].sort((a, b) => String(b.date).localeCompare(String(a.date)));
          for (const row of sorted) {
            row.followers_total = total;
            const gained = num(row.followers_gained) ?? 0;
            const lost = num(row.followers_lost) ?? 0;
            total = total - gained + lost;
          }
        }
      } catch (e) {
        ctx.warnings.push(`Total d'abonnés indisponible : ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  await upsertInBatches(ctx.admin, "social_account_daily", out, "account_id,date");
  return out.length;
}

/**
 * Compte Windsor à cibler. Un identifiant "auto:..." veut dire qu'on ne le
 * connaît pas encore : la requête prend alors le compte connecté à ce
 * connecteur dans Windsor (un seul par plateforme chez EP Coaching).
 */
function accountFilter(account: SocialAccount): string | undefined {
  return account.external_account_id.startsWith("auto:") ? undefined : account.external_account_id;
}

function postIdOf(cfg: PlatformConfig, r: WindsorRow): string | null {
  if (!cfg.posts) return null;
  for (const f of [cfg.posts.idField, ...(cfg.posts.altIdFields ?? [])]) {
    const v = str(r[f]);
    if (v) return v;
  }
  return null;
}

async function syncPosts(ctx: Ctx, from: string, to: string, withBreakdowns: boolean): Promise<number> {
  const { cfg, account, admin } = ctx;
  const p = cfg.posts;
  if (!p) return 0;
  const meta = [p.idField, ...(p.altIdFields ?? []), p.captionField, p.typeField, p.publishedField, p.urlField, p.thumbnailField, p.durationField].filter((x): x is string => !!x);
  const wanted = [...new Set([...meta, ...p.mappings.map((m) => m.field), ...p.extras])];
  const { fields, missing } = pickFields(wanted, ctx.available);
  if (missing.length) ctx.missing.posts = missing;
  if (!fields.some((f) => f === p.idField || (p.altIdFields ?? []).includes(f))) return 0;
  const present = new Set(fields);
  const rows = await queryConnector(cfg.connector, { fields, dateFrom: from, dateTo: to, accountId: accountFilter(account) });

  interface Acc { meta: WindsorRow; metrics: Partial<Record<PostColumn, number>>; raw: WindsorRow; breakdowns: Record<string, unknown[]> }
  const byId = new Map<string, Acc>();
  for (const r of rows) {
    const id = postIdOf(cfg, r);
    if (!id) continue;
    const metrics = applyMappings<PostColumn>(r, p.mappings, present);
    const prev = byId.get(id);
    if (prev) {
      for (const [k, v] of Object.entries(metrics)) prev.metrics[k as PostColumn] = Math.max(prev.metrics[k as PostColumn] ?? 0, v as number);
    } else {
      byId.set(id, { meta: r, metrics, raw: r, breakdowns: {} });
    }
  }
  if (byId.size === 0) return 0;

  // Rapports complémentaires (métriques d'analyse par vidéo/reel).
  for (const [i, sup] of (p.supplements ?? []).entries()) {
    const picked = pickFields([p.idField, ...sup.fields], ctx.available);
    if (picked.missing.length) ctx.missing[`posts_supplement_${i + 1}`] = picked.missing;
    if (!picked.fields.includes(p.idField) || picked.fields.length < 2) continue;
    try {
      const supRows = await queryConnector(cfg.connector, { fields: picked.fields, dateFrom: from, dateTo: to, accountId: accountFilter(account) });
      const pres = new Set(picked.fields);
      for (const r of supRows) {
        const acc = byId.get(String(r[p.idField] ?? ""));
        if (!acc) continue;
        Object.assign(acc.metrics, applyMappings<PostColumn>(r, sup.mappings, pres));
        acc.raw = { ...acc.raw, ...r };
      }
    } catch (e) {
      ctx.warnings.push(`Complément ${i + 1} des publications : ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Détails par publication (sources de vues, rétention, audience...).
  if (withBreakdowns) {
    for (const b of cfg.postBreakdowns) {
      const picked = pickFields([p.idField, ...b.fields], ctx.available);
      if (picked.missing.length) {
        ctx.missing[`breakdown_${b.key}`] = picked.missing;
        continue;
      }
      try {
        const bRows = await queryConnector(cfg.connector, { fields: picked.fields, dateFrom: from, dateTo: to, accountId: accountFilter(account) });
        for (const r of bRows) {
          const acc = byId.get(String(r[p.idField] ?? ""));
          if (!acc) continue;
          const entry: Record<string, unknown> = {};
          for (const f of b.fields) entry[f] = r[f];
          (acc.breakdowns[b.key] ??= []).push(entry);
        }
        ctx.counts[`breakdown_${b.key}`] = bRows.length;
      } catch (e) {
        ctx.warnings.push(`${b.label} : ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  const today = todayInParis();
  const nowIso = new Date().toISOString();
  const postRows = [...byId.entries()].map(([id, a]) => {
    const m = a.metrics;
    const eng = m.engagement_rate ?? (() => {
      const base = m.reach ?? m.views ?? m.impressions;
      const inter = (m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0) + (m.saves ?? 0);
      return base ? Math.round((inter / base) * 10000) / 100 : null;
    })();
    return {
      account_id: account.id,
      platform: cfg.platform,
      external_post_id: id,
      caption: p.captionField ? str(a.meta[p.captionField]) : null,
      post_type: p.typeField ? str(a.meta[p.typeField]) : cfg.platform === "tiktok" ? "video" : null,
      published_at: p.publishedField ? toIso(a.meta[p.publishedField]) : null,
      url: p.urlField ? str(a.meta[p.urlField]) : null,
      thumbnail_url: p.thumbnailField ? str(a.meta[p.thumbnailField]) : null,
      duration_seconds: p.durationField ? durationSeconds(a.meta[p.durationField]) : null,
      views: m.views ?? null,
      reach: m.reach ?? null,
      impressions: m.impressions ?? null,
      likes: m.likes ?? null,
      comments: m.comments ?? null,
      shares: m.shares ?? null,
      saves: m.saves ?? null,
      clicks: m.clicks ?? null,
      new_followers: m.new_followers ?? null,
      avg_watch_seconds: m.avg_watch_seconds ?? null,
      completion_rate: m.completion_rate ?? null,
      engagement_rate: eng,
      extra: { raw: a.raw, ...(Object.keys(a.breakdowns).length ? { breakdowns: a.breakdowns } : {}) },
      last_synced_at: nowIso,
    };
  });

  // Upsert des publications (script_id n'est jamais envoyé : un lien fait à
  // la main n'est pas écrasé), puis un snapshot du jour par publication.
  for (let i = 0; i < postRows.length; i += 300) {
    const chunk = postRows.slice(i, i + 300);
    const { data, error } = await admin.from("social_posts").upsert(chunk, { onConflict: "account_id,external_post_id" }).select("id, external_post_id");
    if (error) throw new Error(`social_posts : ${error.message}`);
    const idByExt = new Map(((data ?? []) as { id: string; external_post_id: string }[]).map((r) => [r.external_post_id, r.id]));
    const snaps = chunk
      .map((r) => {
        const postId = idByExt.get(r.external_post_id);
        if (!postId) return null;
        const a = byId.get(r.external_post_id)!;
        return {
          post_id: postId,
          snapshot_date: today,
          views: r.views, reach: r.reach, impressions: r.impressions, likes: r.likes, comments: r.comments,
          shares: r.shares, saves: r.saves, clicks: r.clicks, new_followers: r.new_followers,
          avg_watch_seconds: r.avg_watch_seconds, total_watch_seconds: a.metrics.total_watch_seconds ?? null,
          completion_rate: r.completion_rate, engagement_rate: r.engagement_rate,
          extra: Object.keys(a.breakdowns).length ? { breakdowns: a.breakdowns } : {},
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
    await upsertInBatches(admin, "social_post_metrics", snaps, "post_id,snapshot_date");
  }
  return postRows.length;
}

async function syncAudience(ctx: Ctx, to: string): Promise<number> {
  const { cfg, account } = ctx;
  let written = 0;
  const from = shift(to, -7);
  for (const a of cfg.audience) {
    const wanted = [a.valueField, a.valueField2, a.shareField, a.countField].filter((x): x is string => !!x);
    const picked = pickFields(["date", ...wanted], ctx.available);
    const core = wanted.filter((f) => picked.fields.includes(f));
    if (core.length !== wanted.length) {
      ctx.missing[`audience_${a.dimension}`] = wanted.filter((f) => !core.includes(f));
      continue;
    }
    try {
      const rows = await queryConnector(cfg.connector, { fields: picked.fields, dateFrom: from, dateTo: to, accountId: accountFilter(account) });
      // Dernier jour disponible seulement : une photo de l'audience par date.
      const dates = rows.map((r) => str(r.date)?.slice(0, 10)).filter((d): d is string => !!d).sort();
      const last = dates[dates.length - 1] ?? to;
      const latest = dates.length ? rows.filter((r) => str(r.date)?.slice(0, 10) === last) : rows;
      const byValue = new Map<string, { share: number | null; count: number | null }>();
      for (const r of latest) {
        const v1 = str(r[a.valueField]);
        if (!v1) continue;
        const value = a.valueField2 ? `${v1} | ${str(r[a.valueField2]) ?? "?"}` : v1;
        const share = a.shareField ? num(r[a.shareField]) : null;
        const count = a.countField ? num(r[a.countField]) : null;
        const prev = byValue.get(value);
        byValue.set(value, {
          share: share === null ? prev?.share ?? null : (prev?.share ?? 0) + share,
          count: count === null ? prev?.count ?? null : (prev?.count ?? 0) + count,
        });
      }
      const out = [...byValue.entries()].map(([value, v]) => ({ account_id: account.id, snapshot_date: last, dimension: a.dimension, value: value.slice(0, 200), share: v.share, count: v.count }));
      if (out.length) await upsertInBatches(ctx.admin, "social_audience_snapshots", out, "account_id,snapshot_date,dimension,value");
      ctx.counts[`audience_${a.dimension}`] = out.length;
      written += out.length;
    } catch (e) {
      if (e instanceof WindsorError && e.kind === "auth") throw e;
      ctx.warnings.push(`Audience ${a.dimension} : ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return written;
}

// ── Synchro d'un compte ──────────────────────────────────────────────────

async function syncAccount(admin: Admin, account: SocialAccount, opts: { from: string; to: string; backfill: boolean; deadline: number }): Promise<AccountSyncResult> {
  const cfg = configFor(account.platform);
  if (!cfg) return { platform: account.platform, account: account.name, status: "skipped", rows: 0, details: { reason: "plateforme non synchronisée" } };

  const ctx: Ctx = { admin, account, cfg, available: null, missing: {}, counts: {}, warnings: [] };
  try {
    ctx.available = await availableFields(cfg.connector);
  } catch (e) {
    if (e instanceof WindsorError && (e.kind === "auth" || e.kind === "config")) throw e;
    ctx.warnings.push(`Liste des champs Windsor illisible, requêtes envoyées sans filtre : ${e instanceof Error ? e.message : String(e)}`);
  }

  let rows = 0;
  const failures: string[] = [];
  const step = async (name: string, fn: () => Promise<number>) => {
    try {
      const n = await fn();
      ctx.counts[name] = (ctx.counts[name] ?? 0) + n;
      rows += n;
    } catch (e) {
      if (e instanceof WindsorError && (e.kind === "auth" || e.kind === "config")) throw e;
      failures.push(`${name} : ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  await step("daily", () => syncDaily(ctx, opts.from, opts.to));
  await step("posts", () => syncPosts(ctx, opts.from, opts.to, true));
  await step("audience", () => syncAudience(ctx, opts.to));

  // Backfill historique par tranches, tant qu'il reste du temps. Reprend là
  // où la dernière synchro s'est arrêtée (social_accounts.backfill_until).
  const backfill: Record<string, unknown> = {};
  if (opts.backfill && !account.backfill_done) {
    let cursor = account.backfill_until ?? opts.from;
    let emptyChunks = 0;
    let done = false;
    let chunks = 0;
    while (Date.now() < opts.deadline - 45_000 && cursor > BACKFILL_FLOOR) {
      const chunkTo = shift(cursor, -1);
      const chunkFrom = shift(chunkTo, -(CHUNK_DAYS - 1)) < BACKFILL_FLOOR ? BACKFILL_FLOOR : shift(chunkTo, -(CHUNK_DAYS - 1));
      let got = 0;
      try {
        got += await syncDaily(ctx, chunkFrom, chunkTo);
        got += await syncPosts(ctx, chunkFrom, chunkTo, false);
      } catch (e) {
        if (e instanceof WindsorError && e.kind === "auth") throw e;
        failures.push(`backfill ${chunkFrom} au ${chunkTo} : ${e instanceof Error ? e.message : String(e)}`);
        break;
      }
      rows += got;
      chunks++;
      cursor = chunkFrom;
      emptyChunks = got === 0 ? emptyChunks + 1 : 0;
      await admin.from("social_accounts").update({ backfill_until: cursor }).eq("id", account.id);
      if (emptyChunks >= 2 || cursor <= BACKFILL_FLOOR) {
        done = true;
        break;
      }
    }
    if (done) await admin.from("social_accounts").update({ backfill_done: true }).eq("id", account.id);
    Object.assign(backfill, { chunks, until: cursor, done });
  }

  const details = { counts: ctx.counts, missingFields: ctx.missing, warnings: ctx.warnings, failures, backfill, range: { from: opts.from, to: opts.to } };
  const status: AccountSyncResult["status"] = failures.length === 0 ? "success" : rows > 0 ? "partial" : "error";
  return { platform: account.platform, account: account.name, status, rows, details, ...(failures.length ? { error: failures.join(" | ") } : {}) };
}

// ── Point d'entrée ───────────────────────────────────────────────────────

async function ownerId(admin: Admin): Promise<string | null> {
  const { data } = await admin.from("profiles").select("id").eq("is_platform_owner", true).limit(1).maybeSingle();
  return (data?.id as string) ?? null;
}

export async function runSocialSync(opts: {
  platform?: Platform | null;
  trigger: SyncTrigger;
  days?: number;
  backfill?: boolean;
  budgetMs?: number;
}): Promise<{ results: AccountSyncResult[]; linked: number }> {
  const admin = createAdminClient();
  const deadline = Date.now() + (opts.budgetMs ?? 240_000);
  const to = todayInParis();
  const from = shift(to, -Math.max(30, opts.days ?? 30));
  clearFieldCache();

  let q = admin.from("social_accounts").select("*").eq("active", true);
  if (opts.platform) q = q.eq("platform", opts.platform);
  const { data: accounts, error } = await q;
  if (error) throw new Error(`social_accounts : ${error.message}`);

  const owner = await ownerId(admin);
  const results: AccountSyncResult[] = [];

  for (const account of (accounts ?? []) as SocialAccount[]) {
    const label = PLATFORM_LABELS[account.platform] ?? account.platform;
    const { data: run } = await admin
      .from("social_sync_runs")
      .insert({ platform: account.platform, trigger: opts.trigger, details: { account: account.name } })
      .select("id")
      .single();
    let result: AccountSyncResult;
    try {
      if (!windsorConfigured()) throw new WindsorError("config", "WINDSOR_API_KEY n'est pas défini sur le serveur : ajoute la clé Windsor dans les variables Vercel.");
      result = await syncAccount(admin, account, { from, to, backfill: !!opts.backfill, deadline });
    } catch (e) {
      const ex = explainError(label, e);
      result = { platform: account.platform, account: account.name, status: "error", rows: 0, error: ex.message, errorKind: ex.kind, details: {} };
    }
    results.push(result);

    if (run?.id) {
      await admin
        .from("social_sync_runs")
        .update({
          finished_at: new Date().toISOString(),
          status: result.status === "skipped" ? "success" : result.status,
          rows_written: result.rows,
          error: result.error ?? null,
          details: { account: account.name, errorKind: result.errorKind ?? null, ...result.details },
        })
        .eq("id", run.id);
    }

    if ((result.status === "error" || result.status === "partial") && owner) {
      await notifyUser(owner, {
        type: "social_sync",
        title: result.errorKind === "auth" ? `${label} : reconnexion Windsor nécessaire` : `Synchro ${label} ${result.status === "error" ? "en échec" : "incomplète"}`,
        body: (result.error ?? "Erreur inconnue").slice(0, 400),
        url: "/dashboard/coach/admin/stats-reseaux",
      }).catch(() => {});
    }
  }

  // Relie les nouvelles publications aux scripts du Studio créatif.
  let linked = 0;
  try {
    linked = await linkPostsToScripts(admin);
  } catch (e) {
    console.error("linkPostsToScripts error:", e);
  }
  return { results, linked };
}
