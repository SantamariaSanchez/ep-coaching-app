// Lecture d'une capture d'écran de statistiques (Instagram, TikTok, YouTube,
// Facebook, LinkedIn, Threads), en français ou en anglais.
//
// Décision d'Emmanuel (03/11/2026) : l'appli ne recopie plus les stats des
// réseaux (elles y sont déjà). Le coach envoie une capture de la publication
// qu'il veut comprendre ; le texte est lu dans le navigateur (OCR), puis ce
// module, du code pur sans IA, retrouve les chiffres à côté de chaque libellé.
// Le coach vérifie toujours les chiffres avant d'enregistrer.

export type ScreenshotMetric =
  | "views"
  | "reach"
  | "likes"
  | "comments"
  | "shares"
  | "saves"
  | "newFollowers"
  | "avgWatchSeconds"
  | "durationSeconds"
  | "completionRate";

export type ScreenshotValues = Partial<Record<ScreenshotMetric, number>>;

type Kind = "count" | "seconds" | "percent";

// Ordre important : les libellés les plus précis d'abord (« temps de
// visionnage moyen » avant « temps de visionnage », « nouveaux abonnés »
// avant « abonnés »).
const LABELS: { metric: ScreenshotMetric; kind: Kind; re: RegExp }[] = [
  { metric: "avgWatchSeconds", kind: "seconds", re: /(temps (de visionnage )?moyen|dur[ée]e moyenne (de visionnage|regard[ée]e)|average (watch|view) (time|duration)|avg\.? (watch|view) time|temps moyen regard)/i },
  { metric: "completionRate", kind: "percent", re: /(regard[ée]e? (la vid[ée]o )?en entier|vid[ée]o regard[ée]e en entier|vues compl[èe]tes|watched (the )?full video|completion rate|taux de compl[ée]tion|a regard[ée] jusqu'[àa] la fin)/i },
  { metric: "durationSeconds", kind: "seconds", re: /(dur[ée]e de la vid[ée]o|video (length|duration)|dur[ée]e totale de la vid[ée]o)/i },
  { metric: "newFollowers", kind: "count", re: /(nouveaux abonn[ée]s|abonn[ée]s gagn[ée]s|abonnements|new followers|followers gained|follows\b|abonn[ée]s obtenus)/i },
  { metric: "reach", kind: "count", re: /(comptes touch[ée]s|comptes atteints|accounts reached|port[ée]e|\breach\b|spectateurs uniques|unique viewers)/i },
  { metric: "saves", kind: "count", re: /(enregistrements|enregistr[ée]s|\bsaves?\b|ajouts? aux favoris|favoris|bookmarks?)/i },
  { metric: "shares", kind: "count", re: /(partages|\bshares?\b|envois)/i },
  { metric: "comments", kind: "count", re: /(commentaires|\bcomments?\b)/i },
  { metric: "likes", kind: "count", re: /(mentions? j'?aime|j['’ ]?aime|\blikes?\b|r[ée]actions)/i },
  { metric: "views", kind: "count", re: /(\bvues\b|\bviews\b|lectures|\bplays\b|nombre de vues|vues de la vid[ée]o|video views)/i },
];

const MULT: Record<string, number> = { k: 1e3, K: 1e3, m: 1e6, M: 1e6, md: 1e9, Md: 1e9, b: 1e9, B: 1e9 };

/** « 1,2 k », « 12.5K », « 1 234 », « 1.234 », « 3 M » → nombre. */
export function parseCount(raw: string): number | null {
  const s = raw.replace(/[  ]/g, " ").trim();
  const m = s.match(/(\d{1,3}(?:[ .]\d{3})+|\d+(?:[.,]\d+)?)\s*(k|K|m|M|Md|md|b|B)?(?![a-zA-Z])/);
  if (!m) return null;
  let num = m[1];
  const unit = m[2];
  if (/^\d{1,3}([ .]\d{3})+$/.test(num) && !unit) {
    num = num.replace(/[ .]/g, "");
  } else {
    num = num.replace(/ /g, "").replace(",", ".");
  }
  const v = Number(num);
  if (!Number.isFinite(v)) return null;
  return Math.round(v * (unit ? MULT[unit] ?? 1 : 1));
}

/** « 45 s », « 45,3 s », « 0:45 », « 1:05 », « 1 min 5 s », « 2 min » → secondes. */
export function parseSeconds(raw: string): number | null {
  const s = raw.replace(/[  ]/g, " ");
  const clock = s.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
  if (clock) {
    const [a, b, c] = [Number(clock[1]), Number(clock[2]), clock[3] ? Number(clock[3]) : null];
    return c === null ? a * 60 + b : a * 3600 + b * 60 + c;
  }
  const min = s.match(/(\d+(?:[.,]\d+)?)\s*(min|mn|m)\b/i);
  const sec = s.match(/(\d+(?:[.,]\d+)?)\s*(s|sec|secondes?|seconds?)\b/i);
  if (!min && !sec) return null;
  const n = (x: RegExpMatchArray | null) => (x ? Number(x[1].replace(",", ".")) : 0);
  return Math.round((n(min) * 60 + n(sec)) * 10) / 10;
}

/** « 12,3 % », « 12.3% » → 12.3. */
export function parsePercent(raw: string): number | null {
  const m = raw.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!m) return null;
  const v = Number(m[1].replace(",", "."));
  return Number.isFinite(v) && v >= 0 && v <= 100 ? v : null;
}

function valueFor(kind: Kind, text: string): number | null {
  if (kind === "seconds") return parseSeconds(text);
  if (kind === "percent") return parsePercent(text);
  return parseCount(text);
}

/** Partie d'une ligne débarrassée du libellé (pour ne pas lire « 30 » dans « 30 derniers jours »). */
function rest(line: string, re: RegExp): string {
  return line.replace(re, " ").replace(/\b\d+\s*(derniers|last)\s+(jours|days)\b/gi, " ");
}

/** Libellés présents sur une ligne, dans l'ordre de lecture (sans chevauchement). */
function labelsInLine(line: string): (typeof LABELS)[number][] {
  const hits: { at: number; end: number; label: (typeof LABELS)[number] }[] = [];
  for (const label of LABELS) {
    const re = new RegExp(label.re.source, "gi");
    for (const m of line.matchAll(re)) {
      const at = m.index ?? 0;
      const end = at + m[0].length;
      if (hits.some((h) => at < h.end && end > h.at)) continue;
      hits.push({ at, end, label });
    }
  }
  return hits.sort((a, b) => a.at - b.at).map((h) => h.label);
}

/** Valeurs d'une ligne qui en contient plusieurs (« 45.2K 3.1K », « 9.4s 24.5% »). */
const VALUE_TOKEN = /\d{1,2}:\d{2}(?::\d{2})?|\d{1,3}(?: \d{3})+(?![\d.,])|\d+(?:[.,]\d+)?\s?(?:k|K|M|Md|%|s\b|sec\b|min\b)?/g;

function valueTokens(line: string): string[] {
  return line.match(VALUE_TOKEN)?.map((t) => t.trim()) ?? [];
}

/**
 * Retrouve les chiffres d'une capture : pour chaque libellé reconnu, le
 * nombre sur la même ligne, sinon sur la ligne suivante, sinon sur la ligne
 * précédente (Instagram et TikTok mettent souvent le chiffre au-dessus).
 * Chaque indicateur n'est lu qu'une fois (première occurrence).
 */
export function parseScreenshotText(text: string): ScreenshotValues {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/[|•·]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const isLabel = (l: string) => LABELS.some((x) => x.re.test(l));
  // Ligne qui n'est qu'une valeur (« 45.2K », « 0:09 », « 24,5 % »).
  const isValueLine = (l: string | undefined) => !!l && !isLabel(l) && /\d/.test(l) && l.replace(VALUE_TOKEN, " ").replace(/[\s+\-]/g, "") === "";
  // Mise en page devinée une seule fois : sur la première ligne-libellé sans
  // chiffre, la valeur est-elle au-dessus (TikTok, YouTube) ou en dessous ?
  const firstBare = lines.findIndex((l) => {
    const lab = LABELS.find((x) => x.re.test(l));
    return lab ? valueFor(lab.kind, rest(l, lab.re)) === null : false;
  });
  const above = firstBare > 0 && isValueLine(lines[firstBare - 1]);

  const out: ScreenshotValues = {};
  const used = new Set<number>();
  const take = (idx: number, kind: Kind): number | null => {
    if (idx < 0 || idx >= lines.length || used.has(idx) || isLabel(lines[idx])) return null;
    const v = valueFor(kind, lines[idx]);
    if (v !== null) used.add(idx);
    return v;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Capture en grille (TikTok, YouTube) : plusieurs libellés sur la ligne,
    // les valeurs correspondantes dans le même ordre sur la ligne voisine.
    const several = labelsInLine(line);
    if (several.length >= 2 && several.every((l) => valueFor(l.kind, rest(line, l.re)) === null)) {
      const order = above ? [i - 1, i + 1] : [i + 1, i - 1];
      for (const idx of order) {
        if (idx < 0 || idx >= lines.length || used.has(idx) || !isValueLine(lines[idx])) continue;
        const tokens = valueTokens(lines[idx]);
        if (tokens.length !== several.length) continue;
        several.forEach((l, k) => {
          const v = valueFor(l.kind, tokens[k]);
          if (v !== null && out[l.metric] === undefined) out[l.metric] = v;
        });
        used.add(idx);
        break;
      }
      continue;
    }
    const label = LABELS.find((l) => l.re.test(line) && out[l.metric] === undefined);
    if (!label) continue;
    const same = valueFor(label.kind, rest(line, label.re));
    if (same !== null) {
      out[label.metric] = same;
      continue;
    }
    const order = above ? [i - 1, i + 1] : [i + 1, i - 1];
    for (const idx of order) {
      const v = take(idx, label.kind);
      if (v !== null) {
        out[label.metric] = v;
        break;
      }
    }
  }
  return out;
}
