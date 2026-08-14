"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

// MASTERCLASS.md Axe H : avant ce fichier, aucun error.tsx n'existait nulle
// part dans app/ — une exception non attrapée dans n'importe quel composant
// client (partout dans l'appli) tombait sur l'écran d'erreur générique de
// Next.js, blanc, sans le moindre lien avec l'identité visuelle de l'appli,
// et sans aucun moyen de réessayer sans recharger la page à la main.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erreur non interceptée:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        className="ep-card"
        style={{
          maxWidth: 420,
          width: "100%",
          padding: "36px 28px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(224,30,30,0.12)",
            border: "1px solid rgba(224,30,30,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <AlertTriangle size={24} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
        </div>

        <p
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(224,30,30,0.7)",
            marginBottom: 10,
          }}
        >
          Un imprévu
        </p>

        <h1
          style={{
            fontSize: 20,
            fontWeight: 900,
            color: "#F5EDED",
            letterSpacing: "-0.01em",
            marginBottom: 10,
          }}
        >
          Quelque chose s&apos;est mal passé
        </h1>

        <p
          style={{
            fontSize: 13.5,
            color: "rgba(245,237,237,0.5)",
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          Rien n&apos;a été perdu de ton côté. Réessaie, et si ça persiste,
          reviens un peu plus tard, le temps que ce soit corrigé.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={() => reset()}
            className="ep-btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
            }}
          >
            <RotateCcw size={14} /> Réessayer
          </button>
          <Link
            href="/"
            className="ep-btn-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
            }}
          >
            <Home size={14} /> Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
