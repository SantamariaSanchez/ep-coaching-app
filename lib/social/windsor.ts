// Client de l'API Connectors de Windsor.ai (https://windsor.ai/api-documentation/).
// Clé dans WINDSOR_API_KEY (variable Vercel "Sensitive"), jamais dans le code.
//
// Règle du fondateur : "ne devine aucun nom de champ". Avant chaque requête,
// on demande à Windsor la liste des champs réellement disponibles pour le
// connecteur (/{connector}/fields) et on ne demande que ceux-là. Les champs
// voulus mais absents sont remontés dans le journal de synchro.

const BASE = "https://connectors.windsor.ai";

export type WindsorErrorKind = "config" | "auth" | "rate_limit" | "server" | "request" | "network";

export class WindsorError extends Error {
  kind: WindsorErrorKind;
  status: number | null;
  constructor(kind: WindsorErrorKind, message: string, status: number | null = null) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

export function windsorConfigured(): boolean {
  return !!process.env.WINDSOR_API_KEY;
}

function key(): string {
  const k = process.env.WINDSOR_API_KEY;
  if (!k) throw new WindsorError("config", "WINDSOR_API_KEY n'est pas défini sur le serveur.");
  return k;
}

// Un message d'erreur qui parle de jeton, d'autorisation ou de reconnexion
// veut dire que la plateforme doit être reconnectée dans Windsor.
const AUTH_HINT = /token|expired|expir|re-?auth|reconnect|authori[sz]|unauthori|permission|access denied|credential|oauth/i;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getJson(url: string, timeoutMs = 90_000): Promise<unknown> {
  let lastError: WindsorError | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
      const text = await res.text();
      let body: unknown = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }
      const errMsg = extractError(body) ?? (res.ok ? null : text.slice(0, 300) || `HTTP ${res.status}`);
      if (res.ok && !errMsg) return body;
      if (res.status === 429 || res.status >= 500) {
        lastError = new WindsorError(res.status === 429 ? "rate_limit" : "server", errMsg ?? `HTTP ${res.status}`, res.status);
        await sleep(1500 * (attempt + 1) ** 2);
        continue;
      }
      if (res.status === 401 || res.status === 403 || (errMsg && AUTH_HINT.test(errMsg))) {
        throw new WindsorError("auth", errMsg ?? `HTTP ${res.status}`, res.status);
      }
      throw new WindsorError("request", errMsg ?? `HTTP ${res.status}`, res.status);
    } catch (e) {
      if (e instanceof WindsorError) {
        if (e.kind === "rate_limit" || e.kind === "server") {
          lastError = e;
          continue;
        }
        throw e;
      }
      lastError = new WindsorError("network", e instanceof Error && e.name === "AbortError" ? "Windsor n'a pas répondu à temps." : String(e));
      await sleep(1500 * (attempt + 1));
    } finally {
      clearTimeout(t);
    }
  }
  throw lastError ?? new WindsorError("network", "Windsor injoignable.");
}

function extractError(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (b.error) {
    if (typeof b.error === "string") return b.error;
    const e = b.error as Record<string, unknown>;
    return String(e.message ?? e.code ?? JSON.stringify(e)).slice(0, 300);
  }
  if (typeof b.message === "string" && !Array.isArray(b.data)) return b.message.slice(0, 300);
  return null;
}

// ── Champs disponibles (mis en cache pour la durée d'une synchro) ─────────
const fieldCache = new Map<string, Set<string>>();

export async function availableFields(connector: string): Promise<Set<string>> {
  const cached = fieldCache.get(connector);
  if (cached) return cached;
  const body = await getJson(`${BASE}/${connector}/fields?api_key=${encodeURIComponent(key())}`, 60_000);
  const ids = new Set<string>();
  const visit = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const id = o.id ?? o.field ?? o.name ?? o.field_id;
      if (typeof id === "string") ids.add(id);
      else Object.values(o).forEach(visit);
    } else if (typeof v === "string") ids.add(v);
  };
  visit(body);
  fieldCache.set(connector, ids);
  return ids;
}

export function clearFieldCache() {
  fieldCache.clear();
}

export type WindsorRow = Record<string, string | number | boolean | null>;

export async function queryConnector(
  connector: string,
  opts: { fields: string[]; dateFrom?: string; dateTo?: string; accountId?: string; maxRows?: number }
): Promise<WindsorRow[]> {
  const q = new URLSearchParams({ api_key: key(), fields: opts.fields.join(",") });
  if (opts.dateFrom) q.set("date_from", opts.dateFrom);
  if (opts.dateTo) q.set("date_to", opts.dateTo);
  if (opts.accountId) q.set("select_accounts", opts.accountId);
  if (opts.maxRows) q.set("_max_rows", String(opts.maxRows));
  const body = await getJson(`${BASE}/${connector}?${q.toString()}`);
  const data = body && typeof body === "object" ? (body as { data?: unknown }).data : null;
  if (!Array.isArray(data)) {
    if (Array.isArray(body)) return body as WindsorRow[];
    throw new WindsorError("request", "Réponse Windsor inattendue (pas de tableau data).");
  }
  return data as WindsorRow[];
}

/**
 * Garde les champs voulus que Windsor déclare disponibles. Si la liste des
 * champs n'a pas pu être lue, on ne filtre pas (Windsor refusera alors
 * lui-même un champ invalide, et l'erreur sera journalisée).
 */
export function pickFields(wanted: string[], available: Set<string> | null): { fields: string[]; missing: string[] } {
  if (!available || available.size === 0) return { fields: wanted, missing: [] };
  const fields = wanted.filter((f) => available.has(f));
  return { fields, missing: wanted.filter((f) => !available.has(f)) };
}

/** Texte clair pour le fondateur selon le type d'erreur. */
export function explainError(platformLabel: string, e: unknown): { kind: WindsorErrorKind; message: string } {
  if (e instanceof WindsorError) {
    if (e.kind === "auth") {
      return { kind: "auth", message: `Le jeton Windsor de ${platformLabel} a expiré ou a été révoqué : reconnecte ${platformLabel} dans Windsor (onboard.windsor.ai), puis relance la synchro. Détail : ${e.message}` };
    }
    if (e.kind === "config") return { kind: "config", message: e.message };
    if (e.kind === "rate_limit") return { kind: "rate_limit", message: `Windsor limite les requêtes pour ${platformLabel} (quota atteint), réessaie plus tard. Détail : ${e.message}` };
    return { kind: e.kind, message: `${platformLabel} : ${e.message}` };
  }
  return { kind: "network", message: `${platformLabel} : ${e instanceof Error ? e.message : String(e)}` };
}
