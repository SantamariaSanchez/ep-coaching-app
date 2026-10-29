// Contenu vécu (storytelling) : la matière vient UNIQUEMENT de ce que le
// fondateur écrit ou dicte dans ses notes. Règle absolue du Studio : aucune
// anecdote, aucune journée, aucun résultat inventés. Si la matière manque,
// l'appli demande (relance hebdomadaire), elle ne comble jamais le vide.

export const LIVED_TAG = "vécu";

/** Tags qui rangent une note dans le « vécu » (accents tolérés). */
const LIVED_TAGS = new Set(["vécu", "vecu", "anecdote", "journal", "story", "storytelling", "ma-semaine"]);

/** Une note est « vécue » si elle porte un de ces tags. */
export function isLivedNote(tags: readonly string[] | null | undefined): boolean {
  return (tags ?? []).some((t) => LIVED_TAGS.has(t.toLowerCase()));
}

// Détection automatique : récit au passé à la première personne, daté
// (« aujourd'hui j'ai », « hier », « ce matin »...). Volontairement
// prudente : mieux vaut rater une note que ranger une tâche en « vécu ».
const LIVED_MARKERS = /\b(aujourd'hui|aujourd’hui|hier|ce matin|ce soir|cette semaine|ce week-end|dimanche dernier|la semaine derni[eè]re)\b/i;
const FIRST_PERSON_PAST = /\b(j'ai|j’ai|je suis (all[ée]|rentr[ée]|parti|arriv[ée]|all[ée]e)|on a|m'a dit|m’a dit|ma dit|on m'a|on m’a|je me suis)\b/i;

export function looksLived(text: string): boolean {
  const t = text.trim();
  if (t.length < 60) return false;
  if (/^\s*(\[ \]|todo|à faire|a faire)\b/i.test(t) || /^https?:\/\/\S+$/.test(t)) return false;
  return LIVED_MARKERS.test(t) && FIRST_PERSON_PAST.test(t);
}

/** Ajoute le tag « vécu » quand la note en est une (écrite ou détectée). */
export function withLivedTag(text: string, tags: string[]): string[] {
  if (isLivedNote(tags)) return tags;
  return looksLived(text) ? [...tags, LIVED_TAG] : tags;
}

/** Clé de semaine ISO « 2026-W44 » (lundi → dimanche), sur une date locale. */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Lundi 00:00 (heure locale du serveur) de la semaine de `date`. */
export function mondayStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  return d;
}

export interface WeeklyQuestion {
  id: string;
  label: string;
  placeholder: string;
}

// Questions guidées : courtes, concrètes, répondables à la voix en 1 minute.
// Elles ne suggèrent aucune réponse : on veut le vrai de la semaine.
export const WEEKLY_QUESTIONS: WeeklyQuestion[] = [
  { id: "marquant", label: "Le moment qui t'a marqué cette semaine ?", placeholder: "Une scène, une phrase entendue, un déclic..." },
  { id: "client", label: "Un client ou un message qui t'a fait réagir ?", placeholder: "Ce qu'il a dit, ce que tu lui as répondu (sans le nommer si tu préfères)" },
  { id: "galere", label: "Ce qui n'a pas marché, ou ce que tu as appris ?", placeholder: "Une erreur, un blocage, un tournage raté..." },
  { id: "perso", label: "Une séance, un repas, une journée dont tu veux parler ?", placeholder: "Ce que tu as fait, ressenti, mangé, soulevé..." },
];

export type WeeklyAnswers = Record<string, string>;

/** Texte de la note de la semaine : seulement les réponses données, tag #vécu. */
export function composeWeeklyNote(answers: WeeklyAnswers, now: Date = new Date()): { title: string; text: string; tags: string[] } | null {
  const lines: string[] = [];
  for (const q of WEEKLY_QUESTIONS) {
    const a = (answers[q.id] ?? "").trim();
    if (a) lines.push(`${q.label}\n${a}`);
  }
  if (!lines.length) return null;
  const week = isoWeekKey(now);
  return {
    title: `Ma semaine ${week}`,
    text: `${lines.join("\n\n")}\n\n#${LIVED_TAG} #ma-semaine`,
    tags: [LIVED_TAG, "ma-semaine", `semaine-${week.toLowerCase()}`],
  };
}

export interface LivedNoteLike {
  id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
}

/** Pistes de formats pour une note vécue : jamais le contenu, seulement où le raconter. */
export const LIVED_FORMAT_HINTS: { platform: "instagram" | "youtube" | "linkedin" | "general"; format: string; label: string }[] = [
  { platform: "instagram", format: "storytelling", label: "Reel storytelling" },
  { platform: "youtube", format: "yap", label: "YouTube, version longue" },
  { platform: "linkedin", format: "storytelling", label: "Post LinkedIn" },
  { platform: "general", format: "journee_type", label: "Mail ou journée type" },
];

const MARKER = "Source : ta note vécue";

/** Marqueur de dédoublonnage : une note vécue ne devient idée qu'une fois. */
export const livedSourceMarker = (noteId: string) => `${MARKER} [${noteId}]`;
export const hasLivedMarker = (notes: string | null | undefined, noteId: string) => (notes ?? "").includes(livedSourceMarker(noteId));

/**
 * Idée de contenu tirée d'une note vécue. Le titre est celui de la note, le
 * texte de la note est repris tel quel (aucune reformulation inventée), et les
 * pistes de format sont des suggestions de support, pas du contenu.
 */
export function ideaFromLivedNote(n: LivedNoteLike): { title: string; notes: string; platform: "instagram"; content_format: "storytelling" } {
  const body = n.body.replace(/#[\p{L}\p{N}_-]+/gu, "").replace(/\n{3,}/g, "\n\n").trim();
  const title = (n.title || body.split("\n")[0] || "Mon vécu").replace(/^Ma semaine \d{4}-W\d{2}$/, "Mon vécu de la semaine").slice(0, 120);
  return {
    title,
    notes: `${livedSourceMarker(n.id)}\n\n${body.slice(0, 4500)}\n\nÀ raconter en : ${LIVED_FORMAT_HINTS.map((h) => h.label).join(" · ")}.`,
    platform: "instagram",
    content_format: "storytelling",
  };
}

/** Règles à relire avant d'écrire un script story (outil MCP + prompt). */
export const STORY_RULES = [
  "Utilise UNIQUEMENT les faits des notes vécues ci-dessous : aucun détail, chiffre, lieu, dialogue ou résultat inventé ou « embelli ».",
  "Si un détail manque pour raconter (le déclic, le résultat, la phrase exacte), demande-le à Emmanuel avant d'écrire.",
  "Structure : situation, problème, déclic, résultat, leçon. Commence au milieu de l'action. Une seule leçon.",
  "Vocabulaire des transcripts : ses mots à lui, ton oral, phrases courtes ; pas de tiret cadratin, pas de chapitre ni de timecode.",
  "Un client n'est jamais nommé ni reconnaissable sans son accord.",
];
