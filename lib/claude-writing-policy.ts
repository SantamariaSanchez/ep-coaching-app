// Ce que Claude a le droit d'écrire par le connecteur (décision d'Emmanuel,
// 25/11) : uniquement du face caméra pour les reels et YouTube, plus aucun
// carrousel, plus rien pour les posts et stories Instagram ni Threads.
// LinkedIn reste en post texte. Les autres formats restent dans l'appli pour
// le coach : la règle ne s'applique qu'aux écritures faites par Claude.
// Fichier pur, testé.

export const CLAUDE_STOPPED_PLATFORMS = ["post_insta", "story_insta", "threads"] as const;

/** Message de refus, ou null si Claude peut écrire ce contenu. */
export function claudeFormatRefusal(platform: string, format: string | null | undefined): string | null {
  if ((CLAUDE_STOPPED_PLATFORMS as readonly string[]).includes(platform)) {
    return "Refusé : les posts Instagram, les stories et Threads sont arrêtés (décision d'Emmanuel du 25/11). Écris un reel face caméra à la place. Rien n'a été enregistré.";
  }
  if (format === "carrousel" || format === "image_unique") {
    return "Refusé : plus aucun carrousel ni image (décision d'Emmanuel du 25/11). Reel ou YouTube = face_cam ; LinkedIn = post_texte. Rien n'a été enregistré.";
  }
  if ((platform === "reel" || platform === "youtube") && format && format !== "face_cam") {
    return `Refusé : Claude n'écrit que du face caméra (face_cam) pour les reels et YouTube, pas ${format}. Reprends un gabarit Marvin Ndiaye (page Notion « Gabarits Marvin Ndiaye ») en face caméra. Rien n'a été enregistré.`;
  }
  if (platform === "linkedin" && format && format !== "post_texte") {
    return "Refusé : sur LinkedIn, uniquement post_texte. Rien n'a été enregistré.";
  }
  return null;
}

export const MISSING_POINTS_REFUSAL =
  "Refusé : un reel a aussi sa version « Points clés » (champ points_cles : idee, points, cta). L'idée principale (ou la question, ou le cas à résoudre), 4 à 8 points courts, puis le CTA. Rien n'a été enregistré.";
