import { Compass, Home } from "lucide-react";
import Link from "next/link";

// MASTERCLASS.md Axe H : même constat que error.tsx, mais pour les URLs
// inexistantes (route mal tapée, lien cassé, ancienne ressource supprimée).
// Sans ce fichier, Next.js sert sa page 404 générique par défaut.
export default function NotFound() {
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
          <Compass size={24} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
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
          Erreur 404
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
          Cette page n&apos;existe pas
        </h1>

        <p
          style={{
            fontSize: 13.5,
            color: "rgba(245,237,237,0.5)",
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          Le lien est peut-être cassé ou la page a été déplacée. Retourne à
          l&apos;accueil pour repartir de là.
        </p>

        <Link
          href="/"
          className="ep-btn-primary"
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
  );
}
