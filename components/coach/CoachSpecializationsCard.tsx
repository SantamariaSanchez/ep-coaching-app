"use client";

import { useState, useTransition } from "react";
import { Tags, Check } from "lucide-react";
import { updateSpecializations } from "@/app/dashboard/coach/profile/actions";
import { COACH_SPECIALIZATIONS } from "@/lib/coach-specializations";

// Axe 5 (VISION.md) : étiquettes affichées dans l'annuaire public /coachs,
// pour qu'un membre trouve le bon coach pour SON profil (objectif,
// contrainte). Sauvegarde optimiste immédiate à chaque tap, même
// convention que AcceptingClientsCard (pas de bouton "Enregistrer" séparé).
export default function CoachSpecializationsCard({
  initialSpecializations,
}: {
  initialSpecializations: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSpecializations));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(tag: string) {
    const next = new Set(selected);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    setSelected(next);
    setSaved(false);
    startTransition(async () => {
      const result = await updateSpecializations([...next]);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      }
    });
  }

  return (
    <div className="mt-8">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
        Annuaire public
      </p>
      <h2 className="text-xl font-black uppercase tracking-tight mb-4">Spécialisations</h2>
      <div className="ep-card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <Tags size={18} style={{ color: "#E01E1E", flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 11, color: "rgba(245,237,237,0.45)", lineHeight: 1.5 }}>
            Choisis ce qui te correspond. Un membre pourra te trouver dans l&apos;annuaire public
            selon ces critères (objectif, blessure, TCA...). Aucune sélection = affiché comme
            généraliste par défaut.
            {saved && (
              <span style={{ color: "#4ade80", fontWeight: 700, marginLeft: 8, display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Check size={11} /> Enregistré
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {COACH_SPECIALIZATIONS.map((tag) => {
            const active = selected.has(tag);
            return (
              <button
                key={tag}
                type="button"
                disabled={isPending}
                onClick={() => toggle(tag)}
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: "7px 12px",
                  borderRadius: 999,
                  cursor: "pointer",
                  border: active ? "1px solid #E01E1E" : "1px solid rgba(245,237,237,0.15)",
                  background: active ? "rgba(224,30,30,0.16)" : "rgba(0,0,0,0.25)",
                  color: active ? "#F5EDED" : "rgba(245,237,237,0.55)",
                  transition: "background 0.15s ease, border-color 0.15s ease",
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
