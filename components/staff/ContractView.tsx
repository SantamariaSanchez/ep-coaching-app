import type { StaffContract } from "@/lib/staff-contract";

// Rendu lisible du contrat, partagé par la page de signature et la page
// "Mon poste et contrat" (copie signée).
export default function ContractView({ contract }: { contract: StaffContract }) {
  return (
    <div>
      <p className="ep-label" style={{ marginBottom: 4 }}>{contract.poleName}</p>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: "#F5EDED", margin: "0 0 4px" }}>{contract.title}</h2>
      <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.5)", margin: "0 0 18px" }}>Poste : {contract.roleTitle}</p>
      {contract.articles.map((a) => (
        <section key={a.title} style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: "#F5EDED", margin: "0 0 6px" }}>{a.title}</h3>
          {a.paragraphs.map((p) => (
            <p key={p} style={{ fontSize: 12.5, color: "rgba(245,237,237,0.72)", lineHeight: 1.7, margin: "0 0 6px" }}>{p}</p>
          ))}
          {a.bullets && (
            <ul style={{ margin: "0 0 6px", paddingLeft: 18 }}>
              {a.bullets.map((b) => (
                <li key={b} style={{ fontSize: 12.5, color: "rgba(245,237,237,0.72)", lineHeight: 1.65, marginBottom: 3 }}>{b}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
