"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

// Composant générique repliable (retour direct 2026-09-01 : la section
// Volume & intensité et le bloc "changer de programme" restaient toujours
// dépliés en entier, "ça doit être optimisé et en liste dépliable et pas
// long comme actuellement"). Un seul composant réutilisé pour les deux, au
// lieu de dupliquer la logique d'accordéon à chaque endroit.
export default function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="ep-card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
        aria-expanded={open}
      >
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>{title}</p>
          {subtitle && <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(245,237,237,0.4)" }}>{subtitle}</p>}
        </div>
        <ChevronDown
          size={16}
          style={{ color: "rgba(245,237,237,0.4)", flexShrink: 0, transition: "transform 0.2s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && <div style={{ padding: "0 16px 16px" }}>{children}</div>}
    </div>
  );
}
