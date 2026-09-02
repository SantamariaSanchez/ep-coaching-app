// Grille en lecture seule des jours/exercices d'un programme actif — extrait
// de app/dashboard/client/program/page.tsx (2026-09-02) pour être réutilisé
// partout où on doit montrer "mon programme" directement, sans passer par le
// formulaire d'édition complet (ProgramEditor). Un seul endroit à maintenir
// pour ce rendu plutôt que de le dupliquer à chaque page.

import type { ProgramWithDays } from "@/utils/programs";

export default function ProgramDaysGrid({ program }: { program: ProgramWithDays }) {
  return (
    <div style={{ overflowX: "auto", paddingBottom: 8 }}>
      <div style={{ display: "flex", gap: 12, minWidth: `${program.days.length * 280}px` }}>
        {program.days.map((day, di) => (
          <div
            key={day.id}
            className="ep-card animate-fade-up"
            style={{ flex: 1, minWidth: 260, padding: "18px 16px", animationDelay: `${di * 60}ms` }}
          >
            <p style={{
              fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
              color: "#E01E1E", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid rgba(224,30,30,0.1)",
            }}>
              {day.day_label}
            </p>

            {day.exercises.length === 0 ? (
              <p style={{ fontSize: 12, color: "rgba(245,237,237,0.22)", fontStyle: "italic" }}>Aucun exercice</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {day.exercises.map((ex) => (
                  <div key={ex.id} style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(137,4,4,0.2)", borderRadius: 12, padding: "11px 14px" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#F5EDED", margin: "0 0 6px", lineHeight: 1.3 }}>
                      {ex.name}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                      {ex.sets != null && ex.reps && (
                        <span style={{ fontSize: 11, color: "rgba(245,237,237,0.5)", fontWeight: 600 }}>
                          {ex.sets} × {ex.reps}
                        </span>
                      )}
                      {ex.rir !== null && (
                        <span style={{ fontSize: 11, color: "rgba(245,237,237,0.4)" }}>RIR {ex.rir}</span>
                      )}
                      {ex.rest_seconds != null && ex.rest_seconds > 0 && (
                        <span style={{ fontSize: 11, color: "rgba(245,237,237,0.4)" }}>
                          {ex.rest_seconds >= 60 ? `${Math.floor(ex.rest_seconds / 60)}min` : `${ex.rest_seconds}s`} repos
                        </span>
                      )}
                    </div>
                    {ex.notes && (
                      <p style={{ fontSize: 11, color: "rgba(245,237,237,0.3)", marginTop: 6, fontStyle: "italic", lineHeight: 1.4 }}>
                        {ex.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
