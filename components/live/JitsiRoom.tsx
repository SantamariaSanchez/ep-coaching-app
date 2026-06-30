"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

// Embeds the free, public Jitsi Meet server — real WebRTC group video,
// screen share and chat, no API key or account needed. Room names are
// long random slugs (see generateRoomSlug), so a room is only reachable by
// someone who already has the link, the same security model as a typical
// "anyone with the link" Meet/Zoom invite.
export default function JitsiRoom({
  roomSlug,
  title,
  backHref,
}: {
  roomSlug: string;
  title: string;
  backHref: string;
}) {
  const router = useRouter();
  const src = `https://meet.jit.si/${roomSlug}#config.prejoinPageEnabled=true&config.disableDeepLinking=true`;

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--color-ep-deep)", zIndex: 50, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid rgba(var(--color-ep-dark-red-rgb),0.25)" }}>
        <button
          onClick={() => router.push(backHref)}
          style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "rgba(var(--color-ep-light-rgb),0.5)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          <ChevronLeft size={14} /> Quitter
        </button>
        <p style={{ fontSize: 12, fontWeight: 800, color: "var(--color-ep-light)", margin: 0, flex: 1, textAlign: "center" }}>
          {title}
        </p>
        <div style={{ width: 60 }} />
      </div>
      <iframe
        src={src}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        style={{ flex: 1, border: "none", width: "100%" }}
        title={title}
      />
    </div>
  );
}
