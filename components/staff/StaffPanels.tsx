import { FileText, Circle } from "lucide-react";
import { SALES_CALL_LIBRARY } from "@/lib/sales-call-library";
import { getRoleCard } from "@/lib/staff-roles";
import { memberSummary, parisDate, type TeamMemberData } from "@/lib/staff-kpis";
import type { ApplicationForStaff, NewClientRow } from "@/lib/staff";
import { QUALIFYING_QUESTIONS } from "@/lib/job-applications-shared";

const APP_STATUS: Record<string, { label: string; color: string }> = {
  nouvelle: { label: "Nouvelle", color: "#facc15" },
  en_discussion: { label: "En discussion", color: "#60a5fa" },
  refusee: { label: "Refusée", color: "#f87171" },
  acceptee: { label: "Acceptée", color: "#4ade80" },
};

// RH : les vraies candidatures reçues sur /carrieres, avec le CV en PDF.
export function ApplicationsPanel({ applications }: { applications: ApplicationForStaff[] }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <p className="ep-label" style={{ marginBottom: 8 }}>Candidatures reçues sur la page Carrières ({applications.length})</p>
      {applications.length === 0 ? (
        <div className="ep-card" style={{ padding: "18px 16px" }}>
          <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.45)", margin: 0 }}>Aucune candidature pour l&apos;instant.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {applications.map((a) => {
            const st = APP_STATUS[a.status] ?? APP_STATUS.nouvelle;
            return (
              <details key={a.id} className="ep-card" style={{ padding: "12px 14px" }}>
                <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 800, color: "#F5EDED", margin: "0 0 3px" }}>{a.full_name}</p>
                    <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.5)", margin: 0 }}>
                      {getRoleCard(a.role_key)?.role.title ?? a.role_key} · {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: st.color, border: `1px solid ${st.color}55`, borderRadius: 999, padding: "3px 8px" }}>
                    <Circle size={6} fill={st.color} stroke="none" />
                    {st.label}
                  </span>
                </summary>
                <div style={{ marginTop: 12, fontSize: 12.5, color: "rgba(245,237,237,0.7)", lineHeight: 1.6 }}>
                  <p style={{ margin: "0 0 6px" }}>{a.email}{a.phone ? ` · ${a.phone}` : ""}</p>
                  {QUALIFYING_QUESTIONS.filter((q) => a.answers?.[q.key]).map((q) => (
                    <p key={q.key} style={{ margin: "0 0 6px" }}>
                      <strong style={{ color: "#F5EDED" }}>{q.label}</strong>
                      <br />
                      {a.answers?.[q.key]}
                    </p>
                  ))}
                  {a.cvUrl ? (
                    <a href={a.cvUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#E01E1E", fontWeight: 700 }}>
                      <FileText size={14} /> Ouvrir le CV (PDF)
                    </a>
                  ) : (
                    <p style={{ margin: 0, color: "rgba(245,237,237,0.35)" }}>Pas de CV joint (candidature antérieure au CV obligatoire).</p>
                  )}
                  <p style={{ margin: "10px 0 0", fontSize: 11, color: "rgba(245,237,237,0.35)" }}>
                    Le statut officiel (acceptée, refusée) se change dans Organisation, côté fondateur. Suis ton propre pipeline juste en dessous.
                  </p>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}

// Coach onboarding : vrais clients payants démarrés récemment (nom et dates
// seulement, aucune donnée de santé).
export function NewClientsPanel({ clients }: { clients: NewClientRow[] }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <p className="ep-label" style={{ marginBottom: 8 }}>Clients payants démarrés ces 45 derniers jours ({clients.length})</p>
      <div className="ep-card" style={{ padding: "6px 14px" }}>
        {clients.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.45)", margin: "10px 0" }}>Aucun nouveau client payant pour l&apos;instant.</p>
        ) : (
          clients.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(245,237,237,0.05)" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#F5EDED" }}>{c.full_name ?? "Sans nom"}</span>
              <span style={{ fontSize: 11.5, color: "rgba(245,237,237,0.5)" }}>
                Démarré le {c.start_date ? new Date(`${c.start_date}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "?"}
                {" · "}
                <span style={{ color: c.onboarding_completed_at ? "#4ade80" : "#facc15" }}>
                  {c.onboarding_completed_at ? "Onboarding fait" : "Onboarding pas fini"}
                </span>
              </span>
            </div>
          ))
        )}
      </div>
      <p style={{ fontSize: 11, color: "rgba(245,237,237,0.35)", margin: "8px 2px 0" }}>
        Ajoute chaque nouveau client à ton suivi ci-dessous pour tracer la bienvenue, J+7 et J+30.
      </p>
    </section>
  );
}

export function ScriptsLibrary() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {SALES_CALL_LIBRARY.map((cat) => (
        <details key={cat.id} className="ep-card" style={{ padding: "13px 15px" }}>
          <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 800, color: "#F5EDED" }}>
            {cat.label} <span style={{ fontSize: 11, color: "rgba(245,237,237,0.4)", fontWeight: 600 }}>({cat.questions.length} questions)</span>
          </summary>
          <p style={{ fontSize: 12, color: "rgba(245,237,237,0.5)", margin: "10px 0 12px", lineHeight: 1.6 }}>{cat.intro}</p>
          <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            {cat.questions.map((q) => (
              <li key={q.text} style={{ fontSize: 13, color: "#F5EDED", lineHeight: 1.55 }}>
                {q.text}
                <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.45)", margin: "3px 0 0" }}>{q.note}</p>
              </li>
            ))}
          </ol>
        </details>
      ))}
    </div>
  );
}

export function TeamView({ team }: { team: TeamMemberData[] }) {
  if (team.length === 0) {
    return (
      <div className="ep-card" style={{ padding: "20px 16px" }}>
        <p style={{ fontSize: 13, color: "rgba(245,237,237,0.45)", margin: 0 }}>
          Personne n&apos;est encore rattaché à ton équipe. Dès qu&apos;une recrue de ton pôle signe son contrat, elle
          apparaît ici avec ses chiffres du mois.
        </p>
      </div>
    );
  }
  const today = parisDate(new Date());
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
      {team.map((m) => {
        const lastReport = m.records.filter((r) => r.kind === "report").sort((a, b) => (b.occurred_on ?? "").localeCompare(a.occurred_on ?? ""))[0];
        const reportedToday = lastReport?.occurred_on === today;
        return (
          <div key={m.userId} className="ep-card" style={{ padding: "14px 15px" }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#F5EDED", margin: "0 0 2px" }}>{m.fullName}</p>
            <p style={{ fontSize: 11, color: "rgba(245,237,237,0.45)", margin: "0 0 10px" }}>{getRoleCard(m.roleKey)?.role.title ?? m.roleKey}</p>
            {memberSummary(m).map((k) => (
              <div key={k.label} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, padding: "4px 0", borderTop: "1px solid rgba(245,237,237,0.05)" }}>
                <span style={{ color: "rgba(245,237,237,0.55)" }}>{k.label}</span>
                <span style={{ color: "#F5EDED", fontWeight: 800, textAlign: "right" }}>{k.value}</span>
              </div>
            ))}
            <p style={{ fontSize: 11, margin: "8px 0 0", color: reportedToday ? "#4ade80" : "#facc15" }}>
              {reportedToday
                ? "Rapport du jour envoyé"
                : lastReport
                  ? `Dernier rapport le ${new Date(`${lastReport.occurred_on}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
                  : "Aucun rapport envoyé"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
