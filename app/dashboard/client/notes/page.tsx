import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getClientNotes } from "@/utils/notes";
import { StickyNote } from "lucide-react";

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr + "T12:00:00"));
}

export default async function ClientNotesPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const notes = await getClientNotes(user.id);

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 700, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.6)" }}>
          Suivi
        </span>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", color: "#F5EDED", margin: "4px 0 0" }}>
          Notes du coach
        </h1>
      </div>

      {notes.length === 0 ? (
        <div className="ep-card" style={{ padding: 32, textAlign: "center" }}>
          <StickyNote size={32} style={{ color: "rgba(224,30,30,0.3)", margin: "0 auto 12px" }} strokeWidth={1.5} />
          <p style={{ color: "rgba(245,237,237,0.4)", fontSize: 13 }}>
            Ton coach n&apos;a pas encore laissé de note.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {notes.map((note) => (
            <div key={note.id} className="ep-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#E01E1E", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Semaine {note.week_number ?? "—"} · {formatDate(note.week_start)}
                </span>
                {note.rating != null && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(245,237,237,0.6)" }}>
                    {note.rating}/10
                  </span>
                )}
              </div>

              {note.observations && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)", marginBottom: 4 }}>
                    Observations
                  </p>
                  <p style={{ fontSize: 13, color: "rgba(245,237,237,0.85)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {note.observations}
                  </p>
                </div>
              )}

              {note.nutrition_adjustments && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)", marginBottom: 4 }}>
                    Ajustements nutrition
                  </p>
                  <p style={{ fontSize: 13, color: "rgba(245,237,237,0.85)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {note.nutrition_adjustments}
                  </p>
                </div>
              )}

              {note.program_adjustments && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)", marginBottom: 4 }}>
                    Ajustements programme
                  </p>
                  <p style={{ fontSize: 13, color: "rgba(245,237,237,0.85)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {note.program_adjustments}
                  </p>
                </div>
              )}

              {note.next_actions && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)", marginBottom: 4 }}>
                    Actions à venir
                  </p>
                  <p style={{ fontSize: 13, color: "rgba(245,237,237,0.85)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {note.next_actions}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
