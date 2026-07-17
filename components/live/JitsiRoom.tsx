"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Square } from "lucide-react";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiAPI;
  }
}

interface JitsiAPI {
  executeCommand: (command: string, ...args: unknown[]) => void;
  dispose: () => void;
  addEventListener: (event: string, listener: (...args: unknown[]) => void) => void;
}

// Embeds the free, public Jitsi Meet server — real WebRTC group video,
// screen share and chat, no API key or account needed. Room names are
// long random slugs (see generateRoomSlug), so a room is only reachable by
// someone who already has the link, the same security model as a typical
// "anyone with the link" Meet/Zoom invite.
//
// Chargé via JitsiMeetExternalAPI (plutôt qu'une simple iframe) pour avoir
// un vrai contrôle programmatique — surtout "raccrocher" proprement au lieu
// de juste changer de page en laissant la connexion WebRTC locale trainer.
export default function JitsiRoom({
  roomSlug,
  title,
  backHref,
  isHost = false,
  onEndLive,
}: {
  roomSlug: string;
  title: string;
  backHref: string;
  /** true pour le coach, toujours hôte du live — voir host_id en base */
  isHost?: boolean;
  /** Réservé à l'hôte : marque le live comme terminé (voir endLiveEvent) */
  onEndLive?: () => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiAPI | null>(null);
  const [ready, setReady] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function init() {
      if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;
      apiRef.current = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName: roomSlug,
        parentNode: containerRef.current,
        width: "100%",
        height: "100%",
        configOverwrite: {
          prejoinPageEnabled: true,
          disableDeepLinking: true,
        },
      });
      apiRef.current.addEventListener("videoConferenceLeft", () => {
        router.push(backHref);
      });
      setReady(true);
    }

    if (window.JitsiMeetExternalAPI) {
      init();
    } else {
      const script = document.createElement("script");
      script.src = "https://meet.jit.si/external_api.js";
      script.async = true;
      script.onload = init;
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSlug]);

  function handleLeave() {
    if (apiRef.current) {
      apiRef.current.executeCommand("hangup");
    } else {
      router.push(backHref);
    }
  }

  async function handleEndLive() {
    if (!onEndLive || ending) return;
    setEnding(true);
    await onEndLive();
    handleLeave();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#070000", zIndex: 50, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid rgba(137,4,4,0.25)" }}>
        <button
          onClick={handleLeave}
          style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "rgba(245,237,237,0.5)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          <ChevronLeft size={14} /> Quitter
        </button>
        <p style={{ fontSize: 12, fontWeight: 800, color: "#F5EDED", margin: 0, flex: 1, textAlign: "center" }}>
          {title}
        </p>
        {isHost && onEndLive ? (
          <button
            onClick={handleEndLive}
            disabled={ending}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(224,30,30,0.15)", border: "1px solid rgba(224,30,30,0.3)", borderRadius: 8, padding: "5px 10px", color: "#E01E1E", fontSize: 11, fontWeight: 700, cursor: ending ? "wait" : "pointer" }}
          >
            <Square size={11} />
            {ending ? "…" : "Terminer"}
          </button>
        ) : (
          <div style={{ width: 60 }} />
        )}
      </div>
      <div ref={containerRef} style={{ flex: 1, width: "100%" }} />
      {!ready && (
        <div style={{ position: "absolute", inset: 0, top: 45, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(245,237,237,0.3)", fontSize: 12 }}>
          Connexion…
        </div>
      )}
    </div>
  );
}
