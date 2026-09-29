"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";

// Invitation à configurer "Mon appli" tant que le questionnaire n'a pas été
// rempli. Masquable pour la session en cours (elle revient à la prochaine).
const KEY = "ep-setup-prompt-hidden";
const subscribe = () => () => {};

export default function AppSetupPrompt({ href }: { href: string }) {
  const hiddenAtLoad = useSyncExternalStore(subscribe, () => sessionStorage.getItem(KEY) === "1", () => true);
  const [closed, setClosed] = useState(false);
  if (hiddenAtLoad || closed) return null;
  return (
    <div style={{ padding: "12px 16px 0" }}>
      <div className="ep-card-hero" style={{ maxWidth: 760, margin: "0 auto", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <SlidersHorizontal size={18} style={{ color: "#E01E1E", flexShrink: 0 }} />
        <p style={{ flex: 1, fontSize: 13, color: "rgba(245,237,237,0.8)", margin: 0, lineHeight: 1.5 }}>
          <strong style={{ color: "#F5EDED" }}>Configure ton appli en 1 minute</strong> : garde seulement ce que tu utilises vraiment.
        </p>
        <Link href={href} className="ep-btn-primary" style={{ fontSize: 11, padding: "8px 12px", textDecoration: "none", flexShrink: 0 }}>
          C&apos;est parti
        </Link>
        <button
          type="button"
          aria-label="Plus tard"
          onClick={() => {
            try {
              sessionStorage.setItem(KEY, "1");
            } catch {}
            setClosed(true);
          }}
          style={{ background: "none", border: "none", color: "rgba(245,237,237,0.4)", cursor: "pointer", padding: 4 }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
