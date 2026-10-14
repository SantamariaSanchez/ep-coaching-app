import EmbeddedVideo from "@/components/ui/EmbeddedVideo";

// Médias du retour de check-in du coach, affichés à l'identique côté coach
// et côté client : message vocal, vidéo enregistrée dans l'appli, ou lien
// externe (Loom, ScreenPal, YouTube...).
export default function CoachReplyMedia({
  audioUrl,
  videoUrl,
  videoLink,
}: {
  audioUrl?: string | null;
  videoUrl?: string | null;
  videoLink?: string | null;
}) {
  if (!audioUrl && !videoUrl && !videoLink) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {audioUrl && (
        <audio
          src={audioUrl}
          controls
          preload="metadata"
          style={{ width: "100%", maxWidth: 360, marginTop: 10 }}
        />
      )}
      {videoUrl && (
        <video src={videoUrl} controls playsInline style={{ width: "100%", maxWidth: 360, borderRadius: 10, marginTop: 10 }} />
      )}
      {!videoUrl && videoLink && <EmbeddedVideo url={videoLink} maxWidth={360} />}
    </div>
  );
}
