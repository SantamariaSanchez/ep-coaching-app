"use client";

import { useEffect, useState } from "react";
import { Type, Sparkles } from "lucide-react";
import {
  DEFAULT_ACCESSIBILITY,
  TEXT_SCALE_OPTIONS,
  readAccessibility,
  saveAccessibility,
  type AccessibilitySettings,
} from "@/lib/accessibility";

// Le zoom à deux doigts est coupé dans toute l'appli (viewport
// userScalable=false, voir app/layout.tsx) : sans réglage de taille de texte,
// une personne qui voit mal n'avait aucun moyen d'agrandir quoi que ce soit.
// Même carte pour coach, client accompagné, membre gratuit et équipe : le
// besoin ne dépend pas du rôle.
export default function AccessibilityCard({ className = "mt-8" }: { className?: string }) {
  // Valeur par défaut au premier rendu (identique serveur/client), puis
  // lecture du stockage local une fois monté.
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_ACCESSIBILITY);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronisation unique avec localStorage après montage
    setSettings(readAccessibility());
  }, []);

  function update(patch: Partial<AccessibilitySettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveAccessibility(next);
  }

  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
        Confort de lecture
      </p>
      <h2 className="text-xl font-black uppercase tracking-tight mb-4">Accessibilité</h2>
      <div className="ep-card" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <Type size={18} style={{ color: "#E01E1E", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#F5EDED" }}>Taille du texte</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(245,237,237,0.4)" }}>
                Agrandit tout l&apos;affichage (textes, boutons, icônes) sur cet appareil.
              </p>
            </div>
          </div>
          <div role="radiogroup" aria-label="Taille du texte" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {TEXT_SCALE_OPTIONS.map((opt) => {
              const active = settings.textScale === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update({ textScale: opt.value })}
                  className="ep-press"
                  style={{
                    padding: "10px 6px", borderRadius: 12, cursor: "pointer", textAlign: "center",
                    background: active ? "rgba(224,30,30,0.16)" : "rgba(245,237,237,0.04)",
                    border: active ? "1px solid rgba(224,30,30,0.6)" : "1px solid rgba(245,237,237,0.08)",
                    color: "#F5EDED",
                  }}
                >
                  <span style={{ display: "block", fontSize: 12.5, fontWeight: 800 }}>{opt.label}</span>
                  <span style={{ display: "block", fontSize: 10.5, color: "rgba(245,237,237,0.45)", marginTop: 2 }}>{opt.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(245,237,237,0.06)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Sparkles size={18} style={{ color: settings.reduceMotion ? "#4ade80" : "rgba(245,237,237,0.4)", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#F5EDED" }}>Réduire les animations</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(245,237,237,0.4)" }}>
              Retire les glissements, zooms et le grain animé. Les fondus restent pour signaler les changements.
            </p>
          </div>
          <button
            type="button"
            onClick={() => update({ reduceMotion: !settings.reduceMotion })}
            role="switch"
            aria-checked={settings.reduceMotion}
            aria-label="Réduire les animations"
            style={{
              flexShrink: 0, width: 40, height: 24, borderRadius: 999, border: "none", cursor: "pointer",
              background: settings.reduceMotion ? "#4ade80" : "rgba(245,237,237,0.15)", position: "relative", transition: "background 0.15s ease",
            }}
          >
            <span style={{
              position: "absolute", top: 3, left: settings.reduceMotion ? 19 : 3, width: 18, height: 18, borderRadius: "50%",
              background: "#0d0000", transition: "left 0.15s ease",
            }} />
          </button>
        </div>

        <p style={{ margin: 0, fontSize: 11, color: "rgba(245,237,237,0.35)", lineHeight: 1.5 }}>
          Ces réglages sont propres à cet appareil. Si ton téléphone demande déjà moins d&apos;animations, l&apos;appli le respecte automatiquement.
        </p>
      </div>
    </div>
  );
}
