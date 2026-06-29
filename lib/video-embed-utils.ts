export interface EmbeddableVideo {
  type: "youtube" | "vimeo" | "file" | "link";
  src: string;
}

export function resolveVideoEmbed(url: string): EmbeddableVideo | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,})/);
  if (yt) return { type: "youtube", src: `https://www.youtube.com/embed/${yt[1]}` };

  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { type: "vimeo", src: `https://player.vimeo.com/video/${vimeo[1]}` };

  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(url)) return { type: "file", src: url };

  return { type: "link", src: url };
}
