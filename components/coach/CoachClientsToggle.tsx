"use client";

import { useState } from "react";
import { ChevronDown, Users } from "lucide-react";

interface ClientRow {
  id: string;
  full_name: string | null;
  email: string | null;
  subscription_status: string;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Coaché",
  free: "Gratuit",
  canceled: "Résilié",
};

// Vue lecture seule pour le propriétaire de la plateforme : il voit qui sont
// les clients de chaque coach tiers, sans pouvoir agir dessus (pas de lien,
// pas de messagerie, pas d'édition) — le cloisonnement coach/client reste
// entier, seule la visibilité en haut de la hiérarchie change.
export default function CoachClientsToggle({ clients }: { clients: ClientRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(245,237,237,0.06)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 6, width: "100%",
          background: "none", border: "none", padding: 0, cursor: "pointer",
          fontSize: 11.5, fontWeight: 700, color: "rgba(245,237,237,0.55)",
        }}
      >
        <Users size={12} />
        {clients.length === 0 ? "Aucun client" : `${clients.length} client${clients.length > 1 ? "s" : ""} coaché${clients.length > 1 ? "s" : ""}`}
        {clients.length > 0 && (
          <ChevronDown
            size={12}
            style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
          />
        )}
      </button>

      {open && clients.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {clients.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 10px", borderRadius: 8, background: "rgba(245,237,237,0.02)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#F5EDED" }}>
                  {c.full_name ?? "Sans nom"}
                </p>
                <p style={{ margin: 0, fontSize: 10.5, color: "rgba(245,237,237,0.35)" }}>{c.email}</p>
              </div>
              <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "rgba(245,237,237,0.4)" }}>
                {STATUS_LABELS[c.subscription_status] ?? c.subscription_status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
