// Thèmes saturés (retour d'Emmanuel du 19/11 : « pas toujours reprendre la
// même forme : changer de programme toutes les 2 semaines, la balance, ta
// balance te ment, ton poids sur ta balance »). Au 19/11, sur 92 reels du
// Studio : 19 parlaient de la balance, 27 du logbook. ajouter_script refuse un
// reel dont le sujet (titre, accroche, début du texte) reprend un thème déjà
// présent dans trop de reels récents. Fichier pur, testé dans
// lib/__tests__/saturated-themes.test.ts.

export interface SaturatedTheme {
  id: string;
  label: string;
  re: RegExp;
}

export const SATURATED_THEMES: SaturatedTheme[] = [
  { id: "balance", label: "la balance et le poids qu'elle affiche", re: /\bbalances?\b|\bte p[eè]ses?\b|\bpes[ée]es?\b/i },
  { id: "changer_programme", label: "changer de programme", re: /\bchang\w*\s+(?:sans arr[eê]t\s+|tout le temps\s+|encore\s+)?(?:de|ton|ses|son)\s+programmes?\b|\bnouveau programme toutes les\b/i },
  { id: "logbook", label: "le logbook", re: /\blogbook\b/i },
  { id: "squat_dc", label: "le squat barre ou le développé couché", re: /\bsquats?\b(?!\s+bulgares?)|\bd[ée]velopp[ée]s?\s+couch[ée]s?(?![\p{L}])/iu },
];

/** Partie qui dit le sujet : titre, accroche et début du texte. */
export const SUBJECT_WINDOW = 600;

export function subjectText(title?: string | null, hook?: string | null, content?: string | null): string {
  return [title ?? "", hook ?? "", (content ?? "").slice(0, SUBJECT_WINDOW)].join("\n");
}

/**
 * Thèmes du nouveau sujet déjà présents dans au moins `max` des sujets récents
 * (les plus récents d'abord, `window` au plus).
 */
export function findSaturatedThemes(subject: string, recentSubjects: string[], window = 20, max = 2): { theme: SaturatedTheme; count: number }[] {
  const recent = recentSubjects.slice(0, window);
  const out: { theme: SaturatedTheme; count: number }[] = [];
  for (const theme of SATURATED_THEMES) {
    if (!theme.re.test(subject)) continue;
    const count = recent.filter((s) => theme.re.test(s)).length;
    if (count >= max) out.push({ theme, count });
  }
  return out;
}

export function saturatedRefusal(found: { theme: SaturatedTheme; count: number }[], window = 20): string {
  return [
    "Script refusé : son sujet reprend un thème déjà trop utilisé dans les reels récents.",
    ...found.map((f) => `- ${f.theme.label} : déjà dans ${f.count} des ${window} derniers reels`),
    "Prends un autre sujet : questions_clientes, la banque de sujets neufs de Notion (« Écrire comme on parle ») ou « Choix des exercices (0RIR) » pour parler machines. Rien n'a été enregistré.",
  ].join("\n");
}

// Formes répétées (analyse du Studio au 19/11 : 91 reels sur 102 finissent par
// « commente », 75 titres sur 92 sont en « X : Y »). Règle du PROCESS MAÎTRE :
// jamais la même fin trois fois de suite ; même règle pour le titre à deux-points.
export interface RecentForm {
  title: string | null;
  content: string | null;
}

const COMMENT_CTA = /\bcommente\b/i;
const END_WINDOW = 400;

export function endsWithCommentCta(content: string | null | undefined): boolean {
  const c = (content ?? "").trim();
  return COMMENT_CTA.test(c.slice(-END_WINDOW));
}

export function hasColonTitle(title: string | null | undefined): boolean {
  return /\S\s*:\s*\S/.test(title ?? "");
}

/** Formes qui feraient une troisième fois d'affilée (les 2 plus récents d'abord). */
export function findRepeatedForms(next: RecentForm, recent: RecentForm[]): string[] {
  const last2 = recent.slice(0, 2);
  const out: string[] = [];
  if (last2.length === 2 && endsWithCommentCta(next.content) && last2.every((r) => endsWithCommentCta(r.content))) {
    out.push("la fin « commente [mot] », déjà dans les 2 derniers reels : finis sur l'audit gratuit, « abonne-toi » ou une vraie question");
  }
  if (last2.length === 2 && hasColonTitle(next.title) && last2.every((r) => hasColonTitle(r.title))) {
    out.push("le titre en « X : Y », déjà dans les 2 derniers reels : écris un titre qui se dit à voix haute, sans deux-points");
  }
  return out;
}

export function repeatedFormsRefusal(forms: string[]): string {
  return ["Script refusé : même forme trois fois de suite.", ...forms.map((f) => `- ${f}`), "Rien n'a été enregistré."].join("\n");
}
