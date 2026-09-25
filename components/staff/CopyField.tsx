"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(245,237,237,0.06)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.4)", margin: 0 }}>{label}</p>
        <p style={{ fontSize: 11.5, color: "#F5EDED", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            window.prompt("Copie :", value);
          }
        }}
        aria-label={`Copier : ${label}`}
        style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#E01E1E", border: "none", borderRadius: 8, color: "#fff", fontSize: 11, fontWeight: 700, padding: "7px 10px", cursor: "pointer", flexShrink: 0 }}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "Copié" : "Copier"}
      </button>
    </div>
  );
}
