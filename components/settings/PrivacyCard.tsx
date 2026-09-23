"use client";

import { useState, useTransition, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toggleDirectoryVisible } from "@/app/dashboard/coach/profile/actions";

// Axe FP (MASTERCLASS.md, audit Paramètres 2026-09-23) : aucune rubrique
// Confidentialité n'existait — un coach ne pouvait se retirer de
// l'annuaire public /coachs qu'en désactivant accepting_new_clients, un
// réglage au sens différent (accepter ou non de nouveaux clients, pas être
// visible ou non). Même pattern optimiste + rollback que AcceptingClientsCard.
export default function PrivacyCard({ initialVisible }: { initialVisible: boolean }) {
  const [visible, setVisible] = useState(initialVisible);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setVisible(initialVisible);
  }, [initialVisible]);

  function toggle() {
    const next = !visible;
    const previous = visible;
    setVisible(next);
    startTransition(async () => {
      const result = await toggleDirectoryVisible(next);
      if (result.error) setVisible(previous);
    });
  }

  return (
    <div className="mt-8">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
        Confidentialité
      </p>
      <h2 className="text-xl font-black uppercase tracking-tight mb-4">Visibilité</h2>
      <div className="ep-card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {visible ? (
            <Eye size={18} style={{ color: "#4ade80", flexShrink: 0 }} />
          ) : (
            <EyeOff size={18} style={{ color: "#E01E1E", flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#F5EDED" }}>
              {visible ? "Visible dans l'annuaire public des coachs" : "Masqué de l'annuaire public"}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(245,237,237,0.4)" }}>
              {visible
                ? "N'importe quel visiteur de /coachs peut te trouver et te contacter."
                : "Personne ne te trouve depuis /coachs. Tes clients déjà liés à toi ne sont pas affectés."}
            </p>
          </div>
          <button
            type="button"
            onClick={toggle}
            disabled={isPending}
            role="switch"
            aria-checked={visible}
            aria-label="Visibilité dans l'annuaire public des coachs"
            style={{
              flexShrink: 0, width: 40, height: 24, borderRadius: 999, border: "none", cursor: "pointer",
              background: visible ? "#4ade80" : "rgba(245,237,237,0.15)", position: "relative", transition: "background 0.15s ease",
            }}
          >
            <span style={{
              position: "absolute", top: 3, left: visible ? 19 : 3, width: 18, height: 18, borderRadius: "50%",
              background: "#0d0000", transition: "left 0.15s ease",
            }} />
          </button>
        </div>
      </div>
    </div>
  );
}
