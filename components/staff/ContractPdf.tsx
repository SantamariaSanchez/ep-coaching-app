import { Download, ExternalLink, FileText } from "lucide-react";

// Lecteur du contrat PDF (lib/staff-contract-files.ts). Sur ordinateur, le
// PDF s'affiche dans la page. Sur mobile, les navigateurs n'affichent pas un
// PDF intégré de façon fiable (Android n'affiche rien, iPhone seulement la
// première page) : on l'ouvre dans le lecteur natif du téléphone.
export default function ContractPdf({ viewUrl, downloadUrl, title, downloadLabel = "Télécharger mon contrat (PDF)" }: { viewUrl: string; downloadUrl: string; title: string; downloadLabel?: string }) {
  const btn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: "11px 16px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    textDecoration: "none",
    flex: "1 1 200px",
  };
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="hidden md:block ep-card" style={{ padding: 0, overflow: "hidden", marginBottom: 10 }}>
        <iframe src={`${viewUrl}#view=FitH`} title={title} style={{ display: "block", width: "100%", height: "72vh", border: 0, background: "#0D0000" }} />
      </div>
      <div className="md:hidden ep-card" style={{ padding: "16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
        <FileText size={28} style={{ color: "#E01E1E", flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#F5EDED", margin: 0 }}>{title}</p>
          <p style={{ fontSize: 12, color: "rgba(245,237,237,0.5)", margin: "2px 0 0" }}>Ouvre-le pour le lire en entier avant de signer.</p>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="md:hidden" style={{ ...btn, background: "#E01E1E", color: "#fff" }}>
          <ExternalLink size={14} /> Lire le contrat
        </a>
        <a href={downloadUrl} style={{ ...btn, border: "1px solid rgba(137,4,4,0.45)", color: "rgba(245,237,237,0.85)" }}>
          <Download size={14} /> {downloadLabel}
        </a>
      </div>
      <p style={{ fontSize: 11, color: "rgba(245,237,237,0.35)", margin: "8px 0 0" }}>Lien sécurisé valable 10 minutes, recharge la page s&apos;il a expiré.</p>
    </div>
  );
}
