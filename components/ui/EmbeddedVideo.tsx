import { ExternalLink } from "lucide-react";
import { resolveVideoEmbed } from "@/lib/video-embed-utils";
import { safeExternalUrl } from "@/lib/sanitize";

// Rendu vidéo unifié pour tout lien externe (ScreenPal, YouTube, Vimeo,
// fichier direct...) — extrait de la logique déjà en place dans
// ExerciseLibraryView.tsx (VideoBlock) pour être réutilisé ailleurs dans
// l'appli sans dupliquer le if/else iframe/vidéo/lien à chaque fois.
// Demande explicite du 2026-08-15 : ScreenPal pour les retours vidéo
// (check-ins, corrections d'exercice, comparaisons physique).
export default function EmbeddedVideo({
  url,
  maxWidth = 320,
}: {
  url: string;
  maxWidth?: number;
}) {
  const video = resolveVideoEmbed(url);
  if (!video) return null;

  if (video.type === "youtube" || video.type === "vimeo" || video.type === "screenpal") {
    return (
      <div style={{ aspectRatio: "16 / 9", width: "100%", maxWidth, background: "#000", borderRadius: 10, overflow: "hidden", marginTop: 10 }}>
        <iframe
          src={video.src}
          style={{ width: "100%", height: "100%", border: "none" }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (video.type === "file") {
    return (
      <video src={video.src} controls playsInline style={{ width: "100%", maxWidth, borderRadius: 10, marginTop: 10 }} />
    );
  }

  return (
    <a
      href={safeExternalUrl(video.src) ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#E01E1E", fontWeight: 700, fontSize: 12, marginTop: 10, textDecoration: "none" }}
    >
      Voir la vidéo <ExternalLink size={12} />
    </a>
  );
}
