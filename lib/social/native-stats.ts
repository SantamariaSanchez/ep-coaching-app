import type { Platform } from "@/lib/social/platforms";

// Où trouver ses statistiques complètes, directement sur chaque réseau
// (décision du 03/11/2026 : l'appli ne recopie plus ces chiffres).

export interface NativeStatsLink {
  platform: Platform;
  url: string;
  /** Où cliquer une fois sur place, en une phrase. */
  where: string;
}

const clean = (h: string | null | undefined) => (h ?? "").trim().replace(/^@/, "");

export function nativeStatsLink(platform: Platform, handle?: string | null): NativeStatsLink {
  const h = clean(handle);
  switch (platform) {
    case "instagram":
      return { platform, url: h ? `https://www.instagram.com/${h}/` : "https://www.instagram.com/", where: "Dans l'appli Instagram : ta publication, puis « Voir les statistiques »." };
    case "tiktok":
      return { platform, url: "https://www.tiktok.com/tiktokstudio/analytics", where: "TikTok Studio, onglet Statistiques, ou ta vidéo puis « Statistiques »." };
    case "youtube":
      return { platform, url: "https://studio.youtube.com/", where: "YouTube Studio, onglet Statistiques, puis la vidéo." };
    case "facebook":
      return { platform, url: "https://business.facebook.com/latest/insights", where: "Meta Business Suite, Statistiques, puis Contenu." };
    case "linkedin":
      return { platform, url: "https://www.linkedin.com/analytics/creator/content/", where: "LinkedIn, Statistiques du contenu, puis le post." };
    case "threads":
      return { platform, url: h ? `https://www.threads.net/@${h}` : "https://www.threads.net/", where: "Dans l'appli Threads : ton profil, puis « Statistiques »." };
  }
}
