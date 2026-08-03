import Link from "next/link";
import { PhoneCall } from "lucide-react";

// Avant de reserver un appel, le prospect passe par un questionnaire de
// prequalification — plus de lien Calendly direct.
const PREQUALIFICATION_URL = "https://ep-coaching-formulaires.vercel.app/prequalification";

// Remplace un ancien redirect() silencieux vers /abonnement : l'onglet reste
// visible et cliquable dans la nav, et au clic la personne comprend tout de
// suite pourquoi elle est bloquée au lieu d'atterrir sans explication sur
// une autre page.
export default function CoachOnlyGate({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div style={{ position: "relative", minHeight: "70vh" }}>
      {/* Fond flouté suggérant le contenu, purement décoratif */}
      <div
        aria-hidden
        style={{ filter: "blur(14px)", opacity: 0.35, padding: "32px 20px", userSelect: "none", pointerEvents: "none" }}
      >
        <div style={{ height: 22, width: "60%", background: "rgba(245,237,237,0.15)", borderRadius: 6, marginBottom: 20 }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{ height: 64, background: "rgba(224,30,30,0.08)", border: "1px solid rgba(224,30,30,0.15)", borderRadius: 14, marginBottom: 12 }}
          />
        ))}
      </div>

      {/* Modale centree */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div
          style={{
            maxWidth: 340, width: "100%", textAlign: "center",
            background: "rgba(31,1,1,0.95)", border: "1px solid rgba(224,30,30,0.3)",
            borderRadius: 20, padding: "32px 24px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              width: 52, height: 52, borderRadius: 16, margin: "0 auto 16px",
              background: "rgba(224,30,30,0.12)", border: "1px solid rgba(224,30,30,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Icon size={24} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em", color: "#F5EDED", margin: "0 0 8px" }}>
            {title}
          </h2>
          <p style={{ fontSize: 13, color: "rgba(245,237,237,0.55)", lineHeight: 1.6, margin: "0 0 22px" }}>
            Cette section est réservée aux membres coaching. Tu veux en discuter avec le fondateur ?
          </p>
          <a
            href={PREQUALIFICATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ep-btn-primary"
            style={{ width: "100%", height: 48, fontSize: 13, textDecoration: "none" }}
          >
            <PhoneCall size={16} />
            Réserve ton appel découverte
          </a>
          <Link
            href="/dashboard/client"
            style={{ display: "block", marginTop: 14, fontSize: 12, color: "rgba(245,237,237,0.3)", fontWeight: 600, textDecoration: "none" }}
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
