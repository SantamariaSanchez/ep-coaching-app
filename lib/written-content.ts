// Contenus ÉCRITS du Studio créatif (2026-11-15) : posts LinkedIn, posts
// Threads, posts Instagram et séquences de stories Instagram. Rien à filmer :
// ils vivent dans l'onglet « Posts à publier » (copier, poster, « Publié »),
// jamais dans la file du tournage.
//
// Une seule définition par plateforme : libellé, couleur, formats permis,
// format par défaut et limites. Les objectifs du jour sont réglés par chaque
// coach (lib/content-targets.ts), jamais écrits ici.
// Les contrôles (checkWrittenPost) sont des AVERTISSEMENTS : ils n'empêchent
// jamais de publier, ils signalent ce qui va probablement mal passer.
//
// Limites des plateformes : LinkedIn coupe le post derrière « voir plus »
// vers 210 caractères et refuse au-delà de 3 000 ; une légende Instagram
// s'arrête à 2 200 caractères et se coupe vers 125. Ce sont des chiffres
// publics des plateformes, susceptibles de changer.
//
// Fichier partagé client/serveur, sans import serveur.

import { CONTENT_FORMATS, VIDEO_CONTENT_FORMATS, getContentFormat, parseScript, type ContentFormat, type StoryFrame } from "@/lib/content-formats";

export type WrittenPlatformId = "linkedin" | "threads" | "post_insta" | "story_insta";

export interface WrittenPlatform {
  id: WrittenPlatformId;
  label: string;
  /** Libellé au pluriel pour les onglets. */
  plural: string;
  color: string;
  formats: string[];
  defaultFormat: string;
  /** Réglage « Mes plateformes » qui fait apparaître ce type (Instagram, LinkedIn...). */
  setting: string;
  /** Taille maximale du texte publié (corps du post ou légende). */
  maxChars: number | null;
  /** Caractères visibles avant « voir plus ». */
  foldChars: number | null;
  /** La légende se saisit à part (champ description du script). */
  hasCaption: boolean;
}

export const WRITTEN_PLATFORMS: WrittenPlatform[] = [
  {
    id: "story_insta",
    label: "Story Insta",
    plural: "Stories Insta",
    color: "#F77737",
    formats: ["sequence_stories"],
    defaultFormat: "sequence_stories",
    setting: "instagram",
    maxChars: null,
    foldChars: null,
    hasCaption: false,
  },
  {
    id: "post_insta",
    label: "Post Insta",
    plural: "Posts Insta",
    color: "#E1306C",
    formats: ["carrousel", "image_unique"],
    defaultFormat: "carrousel",
    setting: "instagram",
    maxChars: 2200,
    foldChars: 125,
    hasCaption: true,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    plural: "LinkedIn",
    color: "#0A66C2",
    formats: ["post_texte", "carrousel"],
    defaultFormat: "post_texte",
    setting: "linkedin",
    maxChars: 3000,
    foldChars: 210,
    hasCaption: false,
  },
  {
    id: "threads",
    label: "Threads",
    plural: "Threads",
    color: "var(--ep-ink)",
    formats: ["post_texte"],
    defaultFormat: "post_texte",
    setting: "threads",
    maxChars: 500,
    foldChars: null,
    hasCaption: false,
  },
];

const BY_ID = new Map(WRITTEN_PLATFORMS.map((p) => [p.id as string, p]));

export const WRITTEN_PLATFORM_IDS = WRITTEN_PLATFORMS.map((p) => p.id);

export function isWrittenPlatform(platform: string | null | undefined): platform is WrittenPlatformId {
  return !!platform && BY_ID.has(platform);
}

export function getWrittenPlatform(platform: string | null | undefined): WrittenPlatform | null {
  return (platform && BY_ID.get(platform)) || null;
}

/** Formats proposés pour une plateforme : les formats écrits permis, ou les formats vidéo. */
export function formatsForPlatform(platform: string | null | undefined): ContentFormat[] {
  const w = getWrittenPlatform(platform);
  if (!w) return VIDEO_CONTENT_FORMATS;
  return w.formats.map((id) => CONTENT_FORMATS.find((f) => f.id === id)).filter((f): f is ContentFormat => !!f);
}

/** Format par défaut d'une plateforme ; garde le format courant s'il y est permis. */
export function defaultFormatFor(platform: string | null | undefined, current?: string | null): string {
  const allowed = formatsForPlatform(platform);
  if (current && allowed.some((f) => f.id === current)) return current;
  return getWrittenPlatform(platform)?.defaultFormat ?? allowed[0]?.id ?? "face_cam";
}

export function isFormatAllowed(platform: string | null | undefined, formatId: string | null | undefined): boolean {
  return !!formatId && formatsForPlatform(platform).some((f) => f.id === formatId);
}

/**
 * Format à utiliser pour lire un post écrit. Les anciens posts LinkedIn et
 * Threads ont gardé le format par défaut des vidéos (« face caméra ») : on
 * les lit comme le format par défaut de leur plateforme, sans rien réécrire.
 */
export function effectiveFormat(platform: string | null | undefined, formatId: string | null | undefined): string {
  const w = getWrittenPlatform(platform);
  if (!w) return getContentFormat(formatId).id;
  if (formatId && w.formats.includes(formatId)) return formatId;
  if (!formatId || formatId === "face_cam") return w.defaultFormat;
  return getContentFormat(formatId).id;
}

// ── Contrôles avant publication ─────────────────────────────────────────

export interface WrittenPostInput {
  platform: string;
  content_format?: string | null;
  content: string | null;
  instagram_caption?: string | null;
}

export interface WrittenCheck {
  level: "erreur" | "conseil";
  message: string;
}

const DASH = /[—–]/;
const LINK_IN_BIO = /lien\s+(?:en|dans\s+(?:la|ma))\s+bio/i;

function firstLine(text: string): string {
  return text.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
}

/** Le texte visible avant « voir plus » (coupé au dernier espace). */
export function foldPreview(text: string, foldChars: number): { visible: string; cut: boolean } {
  const t = text.trim();
  if (t.length <= foldChars) return { visible: t, cut: false };
  const slice = t.slice(0, foldChars);
  const space = slice.lastIndexOf(" ");
  return { visible: (space > foldChars * 0.6 ? slice.slice(0, space) : slice).trimEnd(), cut: true };
}

export function storyFrames(formatId: string | null | undefined, content: string | null | undefined): StoryFrame[] {
  const parsed = parseScript(formatId, content);
  return parsed.shape === "frames" ? parsed.frames : [];
}

/**
 * Avertissements sur un post écrit, du plus grave au moins grave. Ne bloque
 * rien : le coach reste maître de ce qu'il publie.
 */
export function checkWrittenPost(post: WrittenPostInput): WrittenCheck[] {
  const w = getWrittenPlatform(post.platform);
  const content = (post.content ?? "").replace(/\r\n/g, "\n").trim();
  const caption = (post.instagram_caption ?? "").trim();
  const out: WrittenCheck[] = [];
  if (!w) return out;
  if (!content) {
    out.push({ level: "erreur", message: "Le post est vide." });
    return out;
  }
  const formatId = effectiveFormat(post.platform, post.content_format);
  const f = getContentFormat(formatId);
  if (!w.formats.includes(f.id)) {
    out.push({ level: "conseil", message: `Le format « ${f.label} » n'est pas prévu pour ${w.label}.` });
  }
  const published = w.hasCaption ? caption : content;
  if (DASH.test(content) || DASH.test(caption)) {
    out.push({ level: "erreur", message: "Tiret cadratin ou demi-cadratin : à remplacer par une virgule ou deux points." });
  }
  if (w.maxChars && published.length > w.maxChars) {
    out.push({ level: "erreur", message: `${published.length} caractères : ${w.label} s'arrête à ${w.maxChars}.` });
  }
  if (w.id === "linkedin" && LINK_IN_BIO.test(content)) {
    out.push({ level: "erreur", message: "« Lien en bio » n'existe pas sur LinkedIn : mets le lien seul en dernière ligne, ou rien." });
  }

  if (w.id === "linkedin" || w.id === "threads") {
    const first = firstLine(content);
    if (w.foldChars && first.length > w.foldChars) {
      out.push({ level: "conseil", message: "La 1re ligne dépasse ce qu'on voit avant « voir plus » : coupe-la." });
    } else if (first.length > 120) {
      out.push({ level: "conseil", message: "1re ligne longue : une accroche se lit d'un coup d'œil." });
    }
    if (/^\s*[-•*]\s+/m.test(content) && f.id === "post_texte") {
      out.push({ level: "conseil", message: "Des puces : la structure LinkedIn de la Bible préfère des lignes courtes sans puces." });
    }
    const urls = content.match(/https?:\/\/\S+/g) ?? [];
    if (urls.length > 1) out.push({ level: "conseil", message: "Plusieurs liens : un post, un seul appel à l'action." });
  }

  if (w.id === "post_insta") {
    if (!caption) out.push({ level: "conseil", message: "Pas de légende : ajoute-la dans le champ description." });
    else if (w.foldChars && firstLine(caption).length > w.foldChars) {
      out.push({ level: "conseil", message: "La 1re ligne de la légende est coupée avant « plus » : raccourcis-la." });
    }
    const parsed = parseScript(formatId, content);
    if (f.id === "carrousel") {
      if (parsed.shape !== "slides") out.push({ level: "conseil", message: "Carrousel non lu : écris « Slide 1 : ... », « Slide 2 : ... »." });
      else if (parsed.slides.length > 10) out.push({ level: "erreur", message: `${parsed.slides.length} slides : Instagram en accepte 10 au plus (20 selon les comptes).` });
      else if (parsed.slides.some((s) => s.text.split(/\s+/).filter(Boolean).length > 25)) {
        out.push({ level: "conseil", message: "Une slide dépasse 25 mots : elle ne se lira pas en défilant." });
      }
    }
    if (f.id === "image_unique") {
      const onImage = parsed.shape === "sections" ? parsed.sections.find((s) => s.label === "Texte sur l'image")?.text ?? "" : "";
      if (onImage.split(/\s+/).filter(Boolean).length > 12) out.push({ level: "conseil", message: "Texte sur l'image trop long : 12 mots au plus." });
    }
  }

  if (w.id === "story_insta") {
    const frames = storyFrames(formatId, content);
    if (frames.length === 0) {
      out.push({ level: "conseil", message: "Séquence non lue : écris « Story 1 : ... », « Story 2 : ... »." });
    } else {
      if (!frames.some((fr) => fr.sticker && fr.sticker.kind !== "lien")) {
        out.push({ level: "conseil", message: "Aucun sondage, question ou curseur : une séquence en garde au moins un." });
      }
      const ctaIndex = frames.findIndex((fr) => fr.lien || fr.sticker?.kind === "lien");
      if (frames.length >= 3 && ctaIndex === frames.length - 1) {
        out.push({ level: "conseil", message: "Le lien est sur la dernière story : place-le au fil du récit, puis reprends l'histoire." });
      }
      if (frames.some((fr) => fr.text.split(/\s+/).filter(Boolean).length > 40)) {
        out.push({ level: "conseil", message: "Une story dépasse 40 mots : personne ne la lit en 5 secondes." });
      }
      if (frames.length > 12) out.push({ level: "conseil", message: `${frames.length} stories : au-delà d'une dizaine, la séquence perd du monde.` });
    }
  }
  return out;
}

/** Ce que le bouton « Copier » met dans le presse-papier. */
export function copyText(post: WrittenPostInput): string {
  const w = getWrittenPlatform(post.platform);
  const content = (post.content ?? "").trim();
  if (w?.hasCaption && post.instagram_caption?.trim()) return post.instagram_caption.trim();
  return content;
}

/** Règles d'une plateforme écrite, à ajouter au prompt du générateur. */
export function writtenPromptRules(platform: string | null | undefined): string | null {
  const w = getWrittenPlatform(platform);
  if (!w) return null;
  const lines: string[] = [];
  if (w.maxChars) lines.push(`${w.label} : ${w.maxChars} caractères au plus${w.foldChars ? `, et seuls les ${w.foldChars} premiers se voient avant « voir plus »` : ""}.`);
  if (w.id === "linkedin") {
    lines.push("Structure LinkedIn : 1re ligne paradoxe, faux problème, phrase de l'avatar ou scène (jamais une intro) ; 2 à 3 lignes de scène ; le vrai problème en une phrase isolée ; 3 à 5 lignes courtes sans puces ; la nuance ; fin sur une question facile OU le lien seul en dernière ligne. Jamais « lien en bio ».");
  }
  if (w.id === "post_insta") {
    lines.push("Post Instagram : le visuel (ou les slides) d'abord, puis la légende à part, 1re ligne courte, un seul appel à l'action. Aucune preuve, aucun résultat client inventé.");
  }
  if (w.id === "story_insta") {
    lines.push("Stories Instagram : une seule idée sur toute la séquence ; story 1 = le moment fort, pas d'intro ; montrer une preuve réelle avant d'expliquer ; au moins un sondage, une question ou un curseur avec une consigne claire ; le lien vers la 4e story, puis la suite de l'histoire ; 40 mots au plus par story ; aucun DM sortant, aucune coulisse inventée.");
  }
  if (w.id === "threads") lines.push("Threads : court, une idée, ton parlé.");
  return lines.join("\n");
}

/** Compte des publications du jour par plateforme (lignes du journal content_published_log). */
export function countByPlatform(rows: { platform: string | null }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    if (!r.platform) continue;
    out[r.platform] = (out[r.platform] ?? 0) + 1;
  }
  return out;
}
