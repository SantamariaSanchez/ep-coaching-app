// Version « Points clés » d'un script (Studio, 25/11) : au lieu de lire un
// texte mot pour mot, le coach tourne à partir d'une idée principale (ou une
// question, ou un cas à résoudre), de quelques points à développer à l'oral,
// et d'un appel à l'action. Fichier pur, client et serveur, testé.

export interface ScriptBullets {
  /** Idée principale, question à laquelle répondre, ou cas pratique. */
  main: string;
  /** Points à développer à l'oral, dans l'ordre. */
  points: string[];
  cta: string;
}

export const MAX_BULLET_POINTS = 12;
const MAX_LEN = 400;

function clip(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, MAX_LEN) : "";
}

/** Nettoie une valeur reçue (navigateur, MCP, base) ; null si tout est vide. */
export function sanitizeBullets(raw: unknown): ScriptBullets | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const points = Array.isArray(r.points)
    ? r.points.map(clip).map((p) => p.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean).slice(0, MAX_BULLET_POINTS)
    : [];
  const out: ScriptBullets = { main: clip(r.main), points, cta: clip(r.cta) };
  return out.main || out.points.length || out.cta ? out : null;
}

/** Une ligne par point, tirets acceptés : ce que le coach tape dans la zone des points. */
export function pointsFromText(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, MAX_BULLET_POINTS);
}

/** Texte à copier ou à lire au prompteur. */
export function bulletsToText(b: ScriptBullets): string {
  return [b.main, ...b.points.map((p) => `- ${p}`), b.cta ? `→ ${b.cta}` : ""].filter(Boolean).join("\n");
}
