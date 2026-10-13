import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";

// Gabarit des pages publiques de contenu (À propos, pages locales) :
// lisible sur téléphone, un seul appel à l'action, maillage vers l'accueil.
export default function PublicPage({
  eyebrow,
  title,
  intro,
  children,
  jsonLd,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
  jsonLd: object;
}) {
  return (
    <main style={{ minHeight: "100vh", padding: "40px 20px 64px", position: "relative", zIndex: 1 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article style={{ maxWidth: 640, margin: "0 auto" }}>
        <Link href="/" aria-label="EP Coaching, accueil" style={{ display: "inline-flex", marginBottom: 28 }}>
          <EPLogo size="sm" showCoaching />
        </Link>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ep-accent)", margin: "0 0 10px" }}>
          {eyebrow}
        </p>
        <h1 style={{ fontSize: "clamp(28px, 7vw, 40px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.08, color: "var(--ep-strong)", margin: "0 0 14px" }}>
          {title}
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: "rgba(var(--ep-ink-rgb),0.7)", margin: "0 0 28px" }}>{intro}</p>
        <div className="ep-public-prose">{children}</div>
        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 10 }}>
          <Link href="/auth/client" className="ep-btn-primary" style={{ height: 54, borderRadius: 16, fontSize: 13, textDecoration: "none" }}>
            Commencer gratuitement <ArrowRight size={16} />
          </Link>
          <p style={{ textAlign: "center", fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.45)", margin: 0 }}>
            Sans carte bancaire · Sans engagement
          </p>
        </div>
        <nav aria-label="Plus sur EP Coaching" style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 14, fontSize: 13 }}>
          <Link href="/" style={{ color: "var(--ep-accent)", fontWeight: 700, textDecoration: "none" }}>Accueil</Link>
          <Link href="/a-propos" style={{ color: "var(--ep-accent)", fontWeight: 700, textDecoration: "none" }}>À propos</Link>
          <Link href="/coach-sportif-annecy" style={{ color: "var(--ep-accent)", fontWeight: 700, textDecoration: "none" }}>Coach sportif à Annecy</Link>
          <Link href="/ressources" style={{ color: "var(--ep-accent)", fontWeight: 700, textDecoration: "none" }}>Guides gratuits</Link>
          <Link href="/coachs" style={{ color: "var(--ep-accent)", fontWeight: 700, textDecoration: "none" }}>Les coachs</Link>
        </nav>
      </article>
    </main>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 26 }}>
      <h2 style={{ fontSize: 19, fontWeight: 900, letterSpacing: "-0.02em", color: "var(--ep-strong)", margin: "0 0 8px" }}>{title}</h2>
      <div style={{ fontSize: 15, lineHeight: 1.65, color: "rgba(var(--ep-ink-rgb),0.72)" }}>{children}</div>
    </section>
  );
}

export function FaqList({ faqs }: { faqs: readonly { q: string; a: string }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {faqs.map(({ q, a }) => (
        <div key={q} className="ep-card" style={{ padding: "14px 16px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--ep-ink)", margin: "0 0 4px" }}>{q}</h3>
          <p style={{ fontSize: 13.5, color: "rgba(var(--ep-ink-rgb),0.62)", margin: 0, lineHeight: 1.55 }}>{a}</p>
        </div>
      ))}
    </div>
  );
}
