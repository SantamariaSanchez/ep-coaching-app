// Cadence de production de contenu (2026-11-15, consigne d'Emmanuel :
// « 4 h de tournage et 4 h de montage par jour, le coût en temps d'un reel
// c'est 5 min tournage compris et d'une vidéo YouTube c'est 2 h tournage
// compris »). Source unique des objectifs du jour affichés dans le Studio
// (onglet Posts à publier) et des chiffres recopiés dans Notion : ne jamais
// réécrire ces nombres ailleurs, importer ce fichier.
//
// Ce sont des DÉCISIONS PRODUIT d'Emmanuel, pas des repères validés : aucune
// donnée ne dit encore que ce volume convertit. On le mesure, on ajuste.
//
// Fichier pur (client et serveur), sans import.

export const PRODUCTION_DAY = {
  /** Minutes de tournage par jour (agenda : 6 h à 10 h). */
  filmingMinutes: 240,
  /** Minutes de montage par jour (agenda : 13 h 05 à 17 h). */
  editingMinutes: 240,
  /** Coût d'un reel, tournage compris. */
  reelMinutes: 5,
  /** Coût d'une vidéo YouTube, tournage compris. */
  youtubeMinutes: 120,
  /** Vidéos YouTube par jour. */
  youtubePerDay: 1,
  /**
   * Extraits courts tirés de la vidéo YouTube du jour (découpe automatique,
   * outil clips_depuis_video). HYPOTHÈSE : leur montage n'est pas compté
   * dans les 8 h, à vérifier sur une vraie semaine.
   */
  youtubeClipsPerDay: 30,
  /** Plateformes où part chaque vidéo courte. */
  shortVideoPlatforms: ["Instagram Reels", "TikTok", "YouTube Shorts", "Facebook Reels", "Threads"],
} as const;

/** Contenus écrits ou automatisés, objectif par jour. */
export const WRITTEN_DAILY_TARGETS = {
  story_insta: 50,
  story_facebook: 50,
  post_insta: 25,
  relais_facebook_threads: 50,
  linkedin: 50,
  mails: 10,
} as const;

export interface CadenceInput {
  filmingMinutes: number;
  editingMinutes: number;
  reelMinutes: number;
  youtubeMinutes: number;
  youtubePerDay: number;
  youtubeClipsPerDay: number;
  shortVideoPlatforms: readonly string[];
}

export interface Cadence {
  /** Reels tournés et montés par jour dans le temps disponible. */
  reelsPerDay: number;
  /** Reels + extraits YouTube. */
  shortVideosPerDay: number;
  /** Vidéos courtes × plateformes. */
  shortPostsPerDay: number;
  youtubePerDay: number;
  writtenPerDay: number;
  totalPerDay: number;
  totalPer30Days: number;
}

/**
 * Le temps de production total (tournage + montage) moins le YouTube, divisé
 * par le coût d'un reel. Arrondi à l'inférieur : on ne promet pas un reel à
 * moitié fait. Jamais négatif.
 */
export function computeCadence(input: CadenceInput = PRODUCTION_DAY, written: Record<string, number> = WRITTEN_DAILY_TARGETS): Cadence {
  const total = Math.max(0, input.filmingMinutes) + Math.max(0, input.editingMinutes);
  const left = Math.max(0, total - Math.max(0, input.youtubePerDay) * Math.max(0, input.youtubeMinutes));
  const reelsPerDay = input.reelMinutes > 0 ? Math.floor(left / input.reelMinutes) : 0;
  const shortVideosPerDay = reelsPerDay + Math.max(0, input.youtubeClipsPerDay);
  const shortPostsPerDay = shortVideosPerDay * input.shortVideoPlatforms.length;
  const writtenPerDay = Object.values(written).reduce((s, n) => s + Math.max(0, n), 0);
  const totalPerDay = shortPostsPerDay + input.youtubePerDay + writtenPerDay;
  return {
    reelsPerDay,
    shortVideosPerDay,
    shortPostsPerDay,
    youtubePerDay: input.youtubePerDay,
    writtenPerDay,
    totalPerDay,
    totalPer30Days: totalPerDay * 30,
  };
}
