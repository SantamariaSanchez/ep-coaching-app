import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

export function P({ children }: { children: ReactNode }) {
  return <p style={{ margin: "0 0 12px" }}>{children}</p>;
}

export function Ul({ children }: { children: ReactNode }) {
  return (
    <ul style={{ margin: "0 0 12px", paddingLeft: 18, display: "grid", gap: 6 }}>{children}</ul>
  );
}

export function Strong({ children }: { children: ReactNode }) {
  return <strong style={{ color: "rgba(245,237,237,0.88)", fontWeight: 700 }}>{children}</strong>;
}

export function LegalPage({
  eyebrow,
  title,
  lastUpdated,
  intro,
  sections,
  showLegalIdentity = true,
}: {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  intro?: ReactNode;
  sections: LegalSection[];
  /**
   * Mentions légales de l'éditeur en pied de page. Obligatoires sur les
   * documents contractuels (CGU, CGV, confidentialité), inutiles ailleurs :
   * ce composant sert aussi à des pages non contractuelles comme
   * l'assistance, où afficher l'identité administrative n'apporte rien et
   * n'a pas à figurer. La marque publique reste "EP Coaching".
   */
  showLegalIdentity?: boolean;
}) {
  return (
    <div style={{ minHeight: "100vh", padding: "32px 18px 64px", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "rgba(245,237,237,0.45)",
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 24,
          }}
        >
          <ArrowLeft size={14} />
          Retour à l&apos;accueil
        </Link>

        <div style={{ marginBottom: 10 }}>
          <EPLogo size="sm" />
        </div>

        <span className="ep-badge-red" style={{ display: "inline-block" }}>
          {eyebrow}
        </span>

        <h1
          style={{
            fontFamily: "var(--font-montserrat,'Montserrat'),sans-serif",
            fontWeight: 900,
            fontSize: "clamp(24px, 6vw, 34px)",
            letterSpacing: "-0.03em",
            color: "#F5EDED",
            margin: "12px 0 6px",
            lineHeight: 1.1,
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: 12, color: "rgba(245,237,237,0.35)", marginBottom: 28, fontWeight: 500 }}>
          Dernière mise à jour : {lastUpdated}
        </p>

        {intro && (
          <div
            className="ep-card"
            style={{
              padding: 20,
              marginBottom: 28,
              fontSize: 13.5,
              lineHeight: 1.7,
              color: "rgba(245,237,237,0.75)",
            }}
          >
            {intro}
          </div>
        )}

        <nav className="ep-card" style={{ padding: "16px 18px", marginBottom: 32 }}>
          <p
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(245,237,237,0.3)",
              margin: "0 0 10px",
            }}
          >
            Sommaire
          </p>
          <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
            {sections.map((s) => (
              <li key={s.id} style={{ fontSize: 12.5 }}>
                <a href={`#${s.id}`} style={{ color: "rgba(245,237,237,0.6)", textDecoration: "none" }}>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {sections.map((s) => (
            <section
              key={s.id}
              id={s.id}
              className="ep-card"
              style={{ padding: "22px 20px", scrollMarginTop: 90 }}
            >
              <h2
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#F5EDED",
                  margin: "0 0 12px",
                  letterSpacing: "-0.01em",
                }}
              >
                {s.title}
              </h2>
              <div style={{ fontSize: 13, lineHeight: 1.8, color: "rgba(245,237,237,0.62)" }}>
                {s.body}
              </div>
            </section>
          ))}
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: 40,
            fontSize: 10.5,
            color: "rgba(245,237,237,0.2)",
            fontWeight: 600,
          }}
        >
          {showLegalIdentity
            ? "EP Coaching · Emmanuel Peccoux · SIRET 10483817200013"
            : "EP Coaching"}
        </p>
      </div>
    </div>
  );
}
