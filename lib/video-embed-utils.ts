export interface EmbeddableVideo {
  type: "youtube" | "vimeo" | "screenpal" | "file" | "link";
  src: string;
}

export function resolveVideoEmbed(url: string): EmbeddableVideo | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,})/);
  if (yt) return { type: "youtube", src: `https://www.youtube.com/embed/${yt[1]}` };

  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { type: "vimeo", src: `https://player.vimeo.com/video/${vimeo[1]}` };

  // ScreenPal (retours vidéo check-in/correction/comparaison physique,
  // demande du 2026-08-15) : le lien copié par le coach ressemble à
  // screenpal.com/watch/<id> ou go.screenpal.com/watch/<id> ; l'iframe
  // d'intégration, elle, vit sur go.screenpal.com/player/<id> (confirmé
  // via la doc ScreenPal). Si jamais l'id ne correspond pas 1:1 entre les
  // deux, le pire cas est un embed vide — le lien "Voir la vidéo"
  // (fallback "link" ci-dessous) reste toujours l'option de repli sûre.
  const screenpal = url.match(/(?:go\.)?screenpal\.com\/(?:watch|player)\/([a-zA-Z0-9]+)/);
  if (screenpal) return { type: "screenpal", src: `https://go.screenpal.com/player/${screenpal[1]}` };

  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(url)) return { type: "file", src: url };

  return { type: "link", src: url };
}
