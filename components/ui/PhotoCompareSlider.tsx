"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronsLeftRight } from "lucide-react";

// Item 35 : comparaison avant/après par curseur glissant plutôt qu'un
// alignement automatique par reconnaissance d'image (hors de portée ici —
// demanderait de la vision par ordinateur pour repérer une pose). Faire
// glisser soi-même le curseur donne déjà une lecture bien plus parlante
// qu'un simple côte-à-côte statique, sans ce risque.
export default function PhotoCompareSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = "Avant",
  afterLabel = "Après",
}: {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [percent, setPercent] = useState(50);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPercent(Math.min(100, Math.max(0, pct)));
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerDown={(e) => {
        draggingRef.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        updateFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (draggingRef.current) updateFromClientX(e.clientX);
      }}
      onPointerUp={() => {
        draggingRef.current = false;
      }}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "3/4",
        borderRadius: 10,
        overflow: "hidden",
        cursor: "ew-resize",
        border: "1px solid rgba(137,4,4,0.25)",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={beforeUrl}
        alt={beforeLabel}
        draggable={false}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - percent}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterUrl}
          alt={afterLabel}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${percent}%`,
          width: 2,
          background: "#E01E1E",
          transform: "translateX(-1px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: `${percent}%`,
          transform: "translate(-50%, -50%)",
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "#E01E1E",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          pointerEvents: "none",
        }}
      >
        <ChevronsLeftRight size={14} style={{ color: "white" }} />
      </div>

      <span
        style={{
          position: "absolute", top: 8, left: 8, fontSize: 9, fontWeight: 800,
          letterSpacing: "0.08em", textTransform: "uppercase", color: "white",
          background: "rgba(0,0,0,0.5)", padding: "3px 8px", borderRadius: 999,
          pointerEvents: "none",
        }}
      >
        {beforeLabel}
      </span>
      <span
        style={{
          position: "absolute", top: 8, right: 8, fontSize: 9, fontWeight: 800,
          letterSpacing: "0.08em", textTransform: "uppercase", color: "white",
          background: "rgba(0,0,0,0.5)", padding: "3px 8px", borderRadius: 999,
          pointerEvents: "none",
        }}
      >
        {afterLabel}
      </span>
    </div>
  );
}
