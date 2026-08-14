"use client";

import { useEffect } from "react";

// MASTERCLASS.md Axe H : filet de dernier recours, seulement si la mise en
// page racine elle-même (app/layout.tsx) plante — cas très rare, mais sans
// ce fichier ce cas précis fait tomber sur l'écran blanc générique de
// Next.js. Doit fournir son propre <html>/<body> (remplace toute la mise en
// page racine) ; volontairement en styles inline plutôt que via les classes
// .ep-card/.ep-btn-primary de globals.css pour dépendre du minimum possible
// si quelque chose est vraiment cassé ailleurs.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erreur racine non interceptée:", error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#0D0000",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            padding: "36px 28px",
            textAlign: "center",
            background: "rgba(24,2,2,0.72)",
            border: "1px solid rgba(224,30,30,0.2)",
            borderRadius: 20,
          }}
        >
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
            reviens un peu plus tard.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              width: "100%",
              padding: "12px 20px",
              borderRadius: 999,
              border: "none",
              background: "#E01E1E",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
