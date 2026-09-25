import { Download } from "lucide-react";
import { parisToday } from "@/lib/staff-stages";

// Formulaire GET vers /api/equipe/export : le navigateur télécharge le
// fichier directement, sans JavaScript. Un select plutôt qu'un
// <input type="month"> (absent de Safari sur ordinateur).
export default function CsvExport({ kind, memberId, label = "Exporter en CSV" }: { kind: string; memberId?: string; label?: string }) {
  const [y, m] = parisToday().split("-").map(Number);
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const name = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
    return { key, name: name.charAt(0).toUpperCase() + name.slice(1) };
  });

  return (
    <form action="/api/equipe/export" method="get" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <input type="hidden" name="kind" value={kind} />
      {memberId && <input type="hidden" name="membre" value={memberId} />}
      <select name="mois" defaultValue={months[0].key} aria-label="Période à exporter" className="ep-input" style={{ width: "auto", minWidth: 0, padding: "7px 10px", fontSize: 12 }}>
        {months.map((mo) => (
          <option key={mo.key} value={mo.key}>{mo.name}</option>
        ))}
        <option value="">Tout l&apos;historique</option>
      </select>
      <button
        type="submit"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 12px",
          borderRadius: 10,
          border: "1px solid rgba(245,237,237,0.14)",
          background: "rgba(245,237,237,0.04)",
          color: "rgba(245,237,237,0.8)",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        <Download size={13} /> {label}
      </button>
    </form>
  );
}
