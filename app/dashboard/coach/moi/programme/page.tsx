export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getActiveProgram } from "@/utils/programs";
import { Dumbbell } from "lucide-react";

export default async function CoachMonProgrammePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const program = await getActiveProgram(user.id);

  return (
    <div className="page-transition" style={{ padding: "32px 20px 100px", maxWidth: 900, margin: "0 auto" }}>

      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Mon entraînement</p>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", color: "#F5EDED", margin: 0, lineHeight: 1.05 }}>
          Mon programme
        </h1>
        {program && (
          <p style={{ marginTop: 6, fontSize: 12, color: "rgba(245,237,237,0.3)", fontWeight: 500 }}>
            {program.name}
            {program.frequency ? ` · ${program.frequency}×/semaine` : ""}
            {program.type ? ` · ${program.type}` : ""}
          </p>
        )}
      </div>

      {!program || program.days.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center", gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(137,4,4,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Dumbbell size={22} style={{ color: "rgba(245,237,237,0.2)" }} strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(245,237,237,0.35)", margin: 0 }}>Aucun programme configuré</p>
          <p style={{ fontSize: 11, color: "rgba(245,237,237,0.2)", margin: 0 }}>Crée-toi un programme depuis l&apos;espace clients.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", paddingBottom: 8 }}>
          <div style={{ display: "flex", gap: 12, minWidth: `${program.days.length * 280}px` }}>
            {program.days.map((day, di) => (
              <div key={day.id} className="ep-card animate-fade-up" style={{ flex: 1, minWidth: 260, padding: "18px 16px", animationDelay: `${di * 60}ms` }}>
                <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#E01E1E", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid rgba(224,30,30,0.1)" }}>
                  {day.day_label}
                </p>
                {day.exercises.length === 0 ? (
                  <p style={{ fontSize: 12, color: "rgba(245,237,237,0.22)", fontStyle: "italic" }}>Aucun exercice</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {day.exercises.map((ex) => (
                      <div key={ex.id} style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(137,4,4,0.2)", borderRadius: 12, padding: "11px 14px" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#F5EDED", margin: "0 0 6px" }}>{ex.name}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                          {ex.sets != null && ex.reps && (
                            <span style={{ fontSize: 11, color: "rgba(245,237,237,0.5)", fontWeight: 600 }}>{ex.sets} × {ex.reps}</span>
                          )}
                          {ex.rir != null && (
                            <span style={{ fontSize: 11, color: "rgba(245,237,237,0.4)", fontWeight: 500 }}>RIR {ex.rir}</span>
                          )}
                          {ex.rest_seconds != null && (
                            <span style={{ fontSize: 11, color: "rgba(245,237,237,0.3)", fontWeight: 500 }}>{ex.rest_seconds}s repos</span>
                          )}
                        </div>
                        {ex.notes && (
                          <p style={{ fontSize: 11, color: "rgba(245,237,237,0.35)", margin: "6px 0 0", fontStyle: "italic" }}>{ex.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
