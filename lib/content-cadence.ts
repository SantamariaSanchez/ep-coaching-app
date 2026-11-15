// Calcul de cadence de production (2026-11-15). Fonction pure : combien de
// reels tiennent dans le temps de tournage et de montage, une fois les
// vidéos YouTube déduites, et ce que ça donne en publications.
//
// Aucun chiffre n'est imposé ici : le temps disponible et les objectifs sont
// RÉGLÉS PAR CHAQUE COACH dans le Studio (lib/content-targets.ts). Le
// calcul sert à lui proposer un objectif de reels réaliste.
//
// Fichier pur (client et serveur), sans import.

export interface CadenceInput {
  filmingMinutes: number;
  editingMinutes: number;
  /** Coût d'un reel, tournage compris. */
  reelMinutes: number;
  /** Coût d'une vidéo YouTube, tournage compris. */
  youtubeMinutes: number;
  youtubePerDay: number;
  /** Extraits courts tirés des vidéos YouTube, hors temps de production. */
  youtubeClipsPerDay: number;
  /** Plateformes où part chaque vidéo courte. */
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
export function computeCadence(input: CadenceInput, written: Record<string, number> = {}): Cadence {
  const total = Math.max(0, input.filmingMinutes) + Math.max(0, input.editingMinutes);
  const left = Math.max(0, total - Math.max(0, input.youtubePerDay) * Math.max(0, input.youtubeMinutes));
  const reelsPerDay = input.reelMinutes > 0 ? Math.floor(left / input.reelMinutes) : 0;
  const shortVideosPerDay = reelsPerDay + Math.max(0, input.youtubeClipsPerDay);
  const shortPostsPerDay = shortVideosPerDay * input.shortVideoPlatforms.length;
  const writtenPerDay = Object.values(written).reduce((s, n) => s + Math.max(0, n), 0);
  const totalPerDay = shortPostsPerDay + Math.max(0, input.youtubePerDay) + writtenPerDay;
  return {
    reelsPerDay,
    shortVideosPerDay,
    shortPostsPerDay,
    youtubePerDay: Math.max(0, input.youtubePerDay),
    writtenPerDay,
    totalPerDay,
    totalPer30Days: totalPerDay * 30,
  };
}
