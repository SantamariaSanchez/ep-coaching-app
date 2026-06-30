"use client";

import { useState } from "react";
import { Play, CheckCircle2, Circle } from "lucide-react";
import { markLessonComplete, unmarkLessonComplete } from "@/app/dashboard/client/formations/actions";

interface VideoPlayerProps {
  youtubeId: string;
  title: string;
  lessonId: string;
  isCompleted: boolean;
  description?: string | null;
  durationMin?: number;
}

export default function VideoPlayer({
  youtubeId,
  title,
  lessonId,
  isCompleted: initialCompleted,
  description,
  durationMin = 10,
}: VideoPlayerProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);

  async function toggleComplete() {
    setLoading(true);
    if (completed) {
      await unmarkLessonComplete(lessonId);
      setCompleted(false);
    } else {
      await markLessonComplete(lessonId);
      setCompleted(true);
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Video iframe */}
      <div
        style={{
          position: "relative",
          width: "100%",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
          background: "#000",
          aspectRatio: "16/9",
          boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
        }}
      >
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1&color=white`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            border: "none",
          }}
        />
      </div>

      {/* Info + completion */}
      <div className="ep-card" style={{ padding: "20px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#F5EDED",
              margin: "0 0 6px",
              lineHeight: 1.2,
            }}>
              {title}
            </h2>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(245,237,237,0.3)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}>
              {durationMin} min
            </span>
          </div>

          {/* Toggle complete button */}
          <button
            onClick={toggleComplete}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 10,
              border: `1px solid ${completed ? "rgba(74,222,128,0.3)" : "rgba(224,30,30,0.2)"}`,
              background: completed ? "rgba(74,222,128,0.08)" : "rgba(224,30,30,0.06)",
              color: completed ? "#4ade80" : "rgba(245,237,237,0.5)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: loading ? "wait" : "pointer",
              transition: "all 0.2s",
              flexShrink: 0,
            }}
          >
            {completed
              ? <><CheckCircle2 size={15} /> Terminé</>
              : <><Circle size={15} /> Marquer</>
            }
          </button>
        </div>

        {description && (
          <>
            <div className="ep-divider-subtle" style={{ margin: "14px 0" }} />
            <p style={{ fontSize: 13, color: "rgba(245,237,237,0.55)", lineHeight: 1.65, margin: 0 }}>
              {description}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* Placeholder shown when no youtube_id yet */
export function VideoComingSoon({ title, durationMin = 10 }: { title: string; durationMin?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Placeholder video area */}
      <div
        style={{
          width: "100%",
          aspectRatio: "16/9",
          borderRadius: "var(--radius-xl)",
          background: "rgba(14,1,1,0.90)",
          border: "1px solid rgba(224,30,30,0.10)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(224,30,30,0.08)",
          border: "1px solid rgba(224,30,30,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Play size={26} style={{ color: "rgba(224,30,30,0.4)" }} strokeWidth={1.5} />
        </div>
        <p style={{ fontSize: 12, color: "rgba(245,237,237,0.25)", margin: 0, fontWeight: 600 }}>
          Vidéo bientôt disponible
        </p>
      </div>

      <div className="ep-card" style={{ padding: "20px" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", color: "#F5EDED", margin: "0 0 6px" }}>
          {title}
        </h2>
        <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(245,237,237,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {durationMin} min · En cours de production
        </span>
      </div>
    </div>
  );
}
