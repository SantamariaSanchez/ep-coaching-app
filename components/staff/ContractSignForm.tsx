"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";
import { signStaffContract } from "@/app/equipe/actions";

export default function ContractSignForm({ expectedName }: { expectedName: string }) {
  const router = useRouter();
  const [signature, setSignature] = useState("");
  const [acceptedContract, setAcceptedContract] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ready = acceptedContract && acceptedTerms && signature.trim().length > 0;

  function sign() {
    setError(null);
    startTransition(async () => {
      const result = await signStaffContract(signature, acceptedContract, acceptedTerms);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push("/equipe?bienvenue=1");
      router.refresh();
    });
  }

  const box: React.CSSProperties = { marginTop: 3, flexShrink: 0, width: 16, height: 16, accentColor: "#E01E1E" };

  return (
    <div className="ep-card-hero" style={{ padding: "20px 18px" }}>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12, cursor: "pointer" }}>
        <input type="checkbox" checked={acceptedContract} onChange={(e) => setAcceptedContract(e.target.checked)} style={box} />
        <span style={{ fontSize: 12.5, color: "rgba(245,237,237,0.7)", lineHeight: 1.55 }}>
          J&apos;ai lu le contrat de collaboration ci-dessus et je l&apos;accepte.
        </span>
      </label>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16, cursor: "pointer" }}>
        <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} style={box} />
        <span style={{ fontSize: 12.5, color: "rgba(245,237,237,0.7)", lineHeight: 1.55 }}>
          J&apos;accepte les{" "}
          <Link href="/legal/equipe" target="_blank" style={{ color: "#E01E1E", fontWeight: 700 }}>Conditions de collaboration</Link>{" "}
          de l&apos;équipe et la{" "}
          <Link href="/legal/confidentialite" target="_blank" style={{ color: "#E01E1E", fontWeight: 700 }}>politique de confidentialité</Link>.
        </span>
      </label>

      <label htmlFor="contract-signature" style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(224,30,30,0.8)", marginBottom: 8 }}>
        Signature : tape ton nom complet ({expectedName})
      </label>
      <input
        id="contract-signature"
        value={signature}
        onChange={(e) => setSignature(e.target.value)}
        placeholder={expectedName}
        autoComplete="off"
        className="ep-input"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontSize: 18 }}
      />

      {error && (
        <p role="alert" style={{ fontSize: 12.5, color: "#FDC4C4", margin: "12px 0 0" }}>{error}</p>
      )}

      <button
        type="button"
        onClick={sign}
        disabled={!ready || pending}
        className="ep-btn-primary"
        style={{ width: "100%", height: 50, marginTop: 16, fontSize: 13, opacity: ready ? 1 : 0.5 }}
      >
        <PenLine size={15} />
        {pending ? "Signature..." : "Signer mon contrat"}
      </button>
      <p style={{ fontSize: 11, color: "rgba(245,237,237,0.35)", margin: "10px 0 0", lineHeight: 1.5 }}>
        Signature électronique horodatée (date, heure, adresse IP, version du contrat). Une copie t&apos;est
        envoyée par email.
      </p>
    </div>
  );
}
