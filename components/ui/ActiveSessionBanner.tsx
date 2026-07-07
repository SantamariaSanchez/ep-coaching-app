"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Dumbbell, ChevronRight } from "lucide-react";

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Bandeau visible sur toutes les pages client quand une séance de logbook
// est en cours ailleurs — sans ça, changer d'onglet pour aller voir sa
// nutrition ou sa communauté faisait perdre toute trace visuelle de la
// séance en cours, qui pouvait sembler "arrêtée" alors qu'elle continue
// tant qu'on n'a pas appuyé sur "Terminer".
export default function ActiveSessionBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    function sync() {
      setSessionId(localStorage.getItem("ep-active-session-id"));
    }
    sync();
    // Un autre onglet/fenêtre peut démarrer ou terminer la séance.
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    const poll = setInterval(sync, 3000);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    function tick() {
      const warmupStart = localStorage.getItem(`ep-warmup-start-${sessionId}`);
      const sessionStart = localStorage.getItem(`ep-session-start-${sessionId}`);
      const start = sessionStart ?? warmupStart;
      setElapsed(start ? Math.floor((Date.now() - parseInt(start, 10)) / 1000) : 0);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sessionId]);

  const onSessionPage = pathname.includes("/logbook/session/");
  if (!sessionId || onSessionPage) return null;

  const base = pathname.startsWith("/dashboard/coach")
    ? "/dashboard/coach/moi/logbook"
    : "/dashboard/client/logbook";

  return (
    <button
      onClick={() => router.push(`${base}/session/${sessionId}`)}
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
        zIndex: 90,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderRadius: 999,
        background: "#E01E1E",
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "0 6px 24px rgba(224,30,30,0.45)",
        color: "#fff",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "rgba(255,255,255,0.18)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
        className="animate-pulse-glow"
      >
        <Dumbbell size={12} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
        Séance en cours · {formatElapsed(elapsed)}
      </span>
      <ChevronRight size={14} style={{ opacity: 0.8, flexShrink: 0 }} />
    </button>
  );
}
