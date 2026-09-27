"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, PenLine } from "lucide-react";
import ContractSignForm from "@/components/staff/ContractSignForm";

// Signature via JotForm (lib/jotform.ts). Au retour de JotForm
// (?jotform=envoye), la page se rafraîchit toute seule jusqu'à ce que le
// webhook ait validé la signature : l'espace s'ouvre alors automatiquement.
// La signature intégrée reste accessible en secours.
export default function JotformSign({ url, waiting, expectedName }: { url: string; waiting: boolean; expectedName: string }) {
  const router = useRouter();
  const [fallback, setFallback] = useState(false);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!waiting || tries >= 40) return;
    const t = setTimeout(() => {
      setTries((n) => n + 1);
      router.refresh();
    }, 3000);
    return () => clearTimeout(t);
  }, [waiting, tries, router]);

  if (waiting) {
    return (
      <div className="ep-card-hero" style={{ padding: "22px 18px", textAlign: "center" }}>
        <Loader2 size={22} className="animate-spin" style={{ color: "#E01E1E", margin: "0 auto 10px" }} />
        <p style={{ fontSize: 15, fontWeight: 800, color: "#F5EDED", margin: "0 0 6px" }}>Signature reçue, on la vérifie</p>
        <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.55)", margin: 0, lineHeight: 1.6 }}>
          {tries >= 40
            ? "La confirmation prend plus de temps que prévu. Recharge la page dans une minute, ou préviens Santamaria dans l'onglet Équipe."
            : "Ton espace s'ouvre tout seul dans quelques secondes. Une copie signée arrive aussi par email."}
        </p>
      </div>
    );
  }

  return (
    <div className="ep-card-hero" style={{ padding: "20px 18px" }}>
      <p style={{ fontSize: 13, color: "rgba(245,237,237,0.7)", lineHeight: 1.6, margin: "0 0 14px" }}>
        La signature se fait sur JotForm, un service de signature électronique : ton nom et ton email sont déjà remplis, il ne reste qu&apos;à signer. Tu reviens ensuite ici automatiquement.
      </p>
      <a
        href={url}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px 16px", borderRadius: 12, background: "#E01E1E", color: "#fff", fontSize: 13, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", textDecoration: "none" }}
      >
        <PenLine size={15} /> Signer mon contrat <ExternalLink size={13} />
      </a>
      {fallback ? (
        <div style={{ marginTop: 16 }}>
          <ContractSignForm expectedName={expectedName} />
        </div>
      ) : (
        <button type="button" onClick={() => setFallback(true)} style={{ display: "block", margin: "12px auto 0", background: "none", border: "none", color: "rgba(245,237,237,0.45)", fontSize: 11.5, textDecoration: "underline", cursor: "pointer" }}>
          JotForm ne s&apos;ouvre pas ? Signer directement ici
        </button>
      )}
    </div>
  );
}
