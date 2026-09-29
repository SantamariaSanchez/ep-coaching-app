// Outils purs (ni "use server", ni "use client") pour reconnaître une vidéo
// YouTube à partir de ce que le fondateur colle dans l'éditeur de formations.
// Vivait avant en fonction privée dans app/dashboard/coach/formations/
// actions.ts, qui ne reconnaissait que watch?v=, youtu.be et /embed/ : une
// URL youtube.com/shorts/ID ou /live/ID passait à travers et était stockée
// telle quelle comme youtube_id, ce qui cassait le lecteur côté membre sans
// le moindre message. Partagé ici pour que l'import en masse (côté client)
// et l'action serveur appliquent exactement la même règle.

// Un identifiant de vidéo YouTube fait toujours 11 caractères de cet alphabet.
export const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function isYoutubeId(value: string): boolean {
  return YOUTUBE_ID_RE.test(value);
}

// Formes reconnues : ID nu, youtube.com/watch?v=ID (www., m., music.),
// youtu.be/ID, youtube.com/embed/ID, youtube-nocookie.com/embed/ID,
// youtube.com/shorts/ID, youtube.com/live/ID, youtube.com/v/ID.
// Renvoie null si rien de reconnaissable : l'appelant doit alors refuser,
// jamais stocker l'entrée brute.
export function extractYoutubeId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (isYoutubeId(value)) return value;

  // (?:^|[/.]) devant le domaine : "notyoutube.com" ne doit pas passer pour
  // youtube.com.
  const patterns = [
    /(?:^|[/.])youtu\.be\/([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/,
    /(?:^|[/.])youtube(?:-nocookie)?\.com\/(?:embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/,
    /(?:^|[/.])youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/,
  ];
  for (const p of patterns) {
    const m = value.match(p);
    if (m) return m[1];
  }
  return null;
}

export interface ParsedYoutubeLine {
  /** Ligne telle que collée (nettoyée des espaces), pour l'afficher si elle
   * n'est pas reconnue. */
  raw: string;
  /** Identifiant reconnu, ou null si la ligne n'est pas une vidéo YouTube. */
  id: string | null;
}

// Une URL (ou un ID) par ligne, dans l'ordre des vidéos. Les lignes vides
// sont ignorées, mais une ligne non reconnue GARDE sa place : le fondateur
// colle ses vidéos dans l'ordre des leçons, décaler toutes les suivantes à
// cause d'une seule ligne fautive les associerait aux mauvaises leçons.
export function parseYoutubeLines(text: string): ParsedYoutubeLine[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((raw) => ({ raw, id: extractYoutubeId(raw) }));
}

// Plafond d'un collage : borne le nombre d'appels oEmbed et de lecteurs
// cachés lancés d'un coup (un module compte rarement plus de 15 vidéos).
export const MAX_YOUTUBE_LINES = 50;

// Résultat de la vérification oEmbed faite côté serveur avant d'associer les
// vidéos aux leçons (voir previewYoutubeVideos dans les actions formations).
//  - ok : lisible dans l'appli (publique ou non répertoriée)
//  - privee : vidéo privée OU intégration désactivée, illisible pour un membre
//  - introuvable : supprimée ou identifiant faux
//  - inconnue : YouTube n'a pas répondu à temps, statut non vérifié
export type YoutubePreviewStatus = "ok" | "privee" | "introuvable" | "inconnue";

export interface YoutubePreview {
  id: string;
  status: YoutubePreviewStatus;
  title?: string;
}

// Conversion secondes (lecteur YouTube) vers minutes (formation_lessons.
// duration_min, entier) : arrondi au plus proche, jamais 0 pour une vidéo
// courte, plafonné à la même borne que la saisie manuelle.
export function secondsToLessonMinutes(seconds: number): number {
  return Math.min(300, Math.max(1, Math.round(seconds / 60)));
}
