// Image « preuve sociale » avant/après, prête pour Instagram (4:5,
// 1080x1350), avec le logo EP Coaching posé automatiquement. Navigateur
// uniquement (canvas). Palette de marque fixe ici, volontairement : l'image
// exportée doit être identique quelle que soit l'ambiance choisie dans
// l'appli (Claire, Douce, Sombre).

export type FaceMask = "none" | "blur" | "band";

export interface SocialProofInput {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel: string;
  afterLabel: string;
  /** Ligne principale, ex. « 12 semaines ». */
  headline: string;
  /** Ligne secondaire sobre, ex. « 3 mars → 26 mai 2026 ». */
  subline: string;
  faceMask: FaceMask;
  logoUrl?: string;
}

export const EXPORT_W = 1080;
export const EXPORT_H = 1350;

const BRAND = {
  bg: "#000000",
  ink: "#FFFFFF",
  muted: "rgba(255,255,255,0.62)",
  accent: "#E01E1E",
  panel: "#111111",
};

// Zone utile du logo dans public/LOGO EP.jpg (960x960, fond noir) : le
// monogramme et « COACHING », sans la grande marge noire autour.
const LOGO_CROP = { sx: 250, sy: 305, sw: 490, sh: 405 };

// Hauteur masquée en haut de chaque photo (tête sur une photo en pied).
const FACE_ZONE = 0.22;

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve(img);
      // Révoqué après décodage : l'image reste dessinable.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}

function loadImageDirect(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("load"));
    img.src = src;
  });
}

/**
 * Charge une image dessinable sans « teinter » le canvas : on passe par
 * fetch (CORS) puis un blob local. Les URL signées Supabase Storage
 * renvoient Access-Control-Allow-Origin, donc c'est le cas normal.
 */
export async function loadDrawableImage(src: string): Promise<HTMLImageElement> {
  try {
    const res = await fetch(src, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(String(res.status));
    return await loadImageFromBlob(await res.blob());
  } catch {
    return loadImageDirect(src);
  }
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Dessine `img` en mode « cover » dans le cadre, légèrement calé vers le haut. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (iw - sw) / 2;
  // Un peu plus de marge en bas qu'en haut : on garde la tête dans le cadre.
  const sy = Math.max(0, Math.min(ih - sh, (ih - sh) * 0.4));
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** Floute une zone du canvas par réduction/agrandissement (marche partout, Safari compris). */
function blurRegion(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const tiny = document.createElement("canvas");
  const factor = 28;
  tiny.width = Math.max(1, Math.round(w / factor));
  tiny.height = Math.max(1, Math.round(h / factor));
  const tctx = tiny.getContext("2d");
  if (!tctx) return;
  tctx.imageSmoothingEnabled = true;
  tctx.drawImage(ctx.canvas, x, y, w, h, 0, 0, tiny.width, tiny.height);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(tiny, 0, 0, tiny.width, tiny.height, x, y, w, h);
  ctx.restore();
}

function fontStack(): string {
  if (typeof document === "undefined") return "system-ui, sans-serif";
  const f = getComputedStyle(document.body).fontFamily;
  return f && f.trim() ? f : "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  date: string,
  highlight: boolean,
  mask: FaceMask,
  font: string
) {
  const r = 28;
  ctx.save();
  roundedRect(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = BRAND.panel;
  ctx.fillRect(x, y, w, h);
  drawCover(ctx, img, x, y, w, h);

  const zoneH = Math.round(h * FACE_ZONE);
  if (mask === "blur") {
    blurRegion(ctx, x, y, w, zoneH);
    blurRegion(ctx, x, y, w, zoneH);
  } else if (mask === "band") {
    ctx.fillStyle = BRAND.bg;
    ctx.fillRect(x, y, w, zoneH);
  }

  // Dégradé bas pour la lisibilité du libellé.
  const grad = ctx.createLinearGradient(0, y + h - 200, 0, y + h);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y + h - 200, w, 200);
  ctx.restore();

  // Libellé AVANT / APRÈS en pastille.
  ctx.save();
  ctx.font = `800 30px ${font}`;
  const text = label.toUpperCase();
  const spaced = text.split("").join(" ");
  const tw = ctx.measureText(spaced).width;
  const px = x + 26;
  const py = y + h - 112;
  roundedRect(ctx, px, py, tw + 40, 52, 26);
  ctx.fillStyle = highlight ? BRAND.accent : "rgba(255,255,255,0.16)";
  ctx.fill();
  ctx.fillStyle = BRAND.ink;
  ctx.textBaseline = "middle";
  ctx.fillText(spaced, px + 20, py + 27);
  ctx.font = `600 26px ${font}`;
  ctx.fillStyle = BRAND.muted;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(date, px + 2, y + h - 26);
  ctx.restore();
}

export async function renderSocialProof(input: SocialProofInput): Promise<Blob> {
  const [before, after, logo] = await Promise.all([
    loadDrawableImage(input.beforeUrl),
    loadDrawableImage(input.afterUrl),
    loadDrawableImage(input.logoUrl ?? "/LOGO EP.jpg").catch(() => null),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_W;
  canvas.height = EXPORT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  const font = fontStack();

  ctx.fillStyle = BRAND.bg;
  ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);

  // Logo centré en haut.
  const logoH = 132;
  const logoW = Math.round((LOGO_CROP.sw / LOGO_CROP.sh) * logoH);
  if (logo) {
    ctx.drawImage(logo, LOGO_CROP.sx, LOGO_CROP.sy, LOGO_CROP.sw, LOGO_CROP.sh, (EXPORT_W - logoW) / 2, 34, logoW, logoH);
  } else {
    ctx.fillStyle = BRAND.ink;
    ctx.font = `900 64px ${font}`;
    ctx.textAlign = "center";
    ctx.fillText("EP COACHING", EXPORT_W / 2, 120);
    ctx.textAlign = "left";
  }

  // Les deux photos côte à côte.
  const margin = 40;
  const gap = 16;
  const top = 196;
  const panelW = (EXPORT_W - margin * 2 - gap) / 2;
  const panelH = 880;
  drawPanel(ctx, before, margin, top, panelW, panelH, "Avant", input.beforeLabel, false, input.faceMask, font);
  drawPanel(ctx, after, margin + panelW + gap, top, panelW, panelH, "Après", input.afterLabel, true, input.faceMask, font);

  // Pied : durée en grand, dates en sobre.
  const footTop = top + panelH;
  ctx.textAlign = "center";
  ctx.fillStyle = BRAND.ink;
  ctx.font = `900 76px ${font}`;
  ctx.fillText(input.headline.toUpperCase(), EXPORT_W / 2, footTop + 132);
  ctx.fillStyle = BRAND.accent;
  ctx.fillRect(EXPORT_W / 2 - 36, footTop + 160, 72, 5);
  ctx.fillStyle = BRAND.muted;
  ctx.font = `600 30px ${font}`;
  ctx.fillText(input.subline, EXPORT_W / 2, footTop + 222);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("export"))), "image/jpeg", 0.92);
  });
}

/**
 * Partage natif (feuille iOS/Android : Instagram, Enregistrer l'image...)
 * quand le navigateur sait partager un fichier, sinon téléchargement.
 * Renvoie "shared", "downloaded" ou "cancelled".
 */
export async function shareOrDownload(blob: Blob, filename: string, title: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title });
        return "shared";
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}
