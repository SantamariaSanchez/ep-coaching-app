"use client";

import Link from "next/link";
import { Gift, ArrowRight } from "lucide-react";

interface ClientCardProps {
  name: string;
  phase?: string | null;
  weight?: number | null;
  weekNum?: number | null;
  alerts?: number;
  href?: string;
  delay?: number;
  onClick?: () => void;
  /** Abonné ayant atteint le rang Légende — récompense Oura Ring à remettre. */
  ouraEligible?: boolean;
  /** Phase de coaching en cours (Calibrage, Optimisation, Performance). */
  coachingPhase?: string | null;
  /** Statut du suivi : un client en pause ou terminé doit se repérer d'un coup d'œil. */
  status?: "active" | "paused" | "ended" | null;
}

export function ClientCard({
  name,
  phase,
  weight,
  weekNum,
  alerts = 0,
  href,
  delay = 0,
  onClick,
  ouraEligible = false,
  coachingPhase = null,
  status = null,
}: ClientCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const phaseColor =
    phase === "deficit"  ? "#E01E1E"
    : phase === "surplus"  ? "#4ade80"
    : "#fb923c";
  const phaseLabel =
    phase === "deficit"  ? "Déficit"
    : phase === "surplus"  ? "Surplus"
    : phase ? "Maintenance"
    : null;

  // "Actif" n'est pas affiché : c'est le cas normal, le signaler ajouterait
  // du bruit sur toutes les cartes sans jamais rien apprendre au coach.
  const statusLabel =
    status === "paused" ? "En pause"
    : status === "ended" ? "Terminé"
    : null;

  return (
    <div
      onClick={onClick}
      className="animate-fade-up"
      style={{
        animationDelay: `${delay}ms`,
        background: "linear-gradient(160deg, #180101 0%, #0d0000 100%)",
        border: "1px solid rgba(224,30,30,0.09)",
        borderRadius: "var(--radius-lg)",
        padding: 20,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!onClick) return;
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(224,30,30,0.28)";
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = "0 12px 40px rgba(0,0,0,0.5)";
      }}
      onMouseLeave={(e) => {
        if (!onClick) return;
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(224,30,30,0.09)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
      }}
    >
      {/* Top accent */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        height: 1,
        background: "linear-gradient(90deg, transparent, rgba(224,30,30,0.25), transparent)",
      }} />

      {/* Oura Ring eligibility badge */}
      {ouraEligible && (
        <div
          title="Rang Légende atteint : Oura Ring à offrir"
          style={{
            position: "absolute",
            top: 14, left: 14,
            background: "rgba(250,204,21,0.12)",
            border: "1px solid rgba(250,204,21,0.35)",
            borderRadius: "50%",
            width: 26, height: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Gift size={12} style={{ color: "#FACC15" }} strokeWidth={2} />
        </div>
      )}

      {/* Alert badge */}
      {alerts > 0 && (
        <div
          className="animate-pulse-glow"
          style={{
            position: "absolute",
            top: 14, right: 14,
            background: "#E01E1E",
            color: "#fff",
            borderRadius: "50%",
            width: 20, height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 800,
          }}
        >
          {alerts > 9 ? "9+" : alerts}
        </div>
      )}

      {/* Header: avatar + name */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          background: "linear-gradient(135deg, #E01E1E, #890404)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-playfair, 'Playfair Display'), serif",
          fontStyle: "italic",
          fontWeight: 800,
          fontSize: 16,
          color: "#F5EDED",
          flexShrink: 0,
          boxShadow: "0 4px 12px rgba(224,30,30,0.2)",
        }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontWeight: 700,
            fontSize: 15,
            color: "#F5EDED",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}>
            {name}
          </div>
          {/* Phase de coaching et statut du suivi : deux informations qu'il
              fallait auparavant ouvrir la fiche pour connaître. */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
            {phaseLabel && (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                background: `${phaseColor}14`,
                border: `1px solid ${phaseColor}28`,
                borderRadius: 20,
                padding: "2px 10px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.07em",
                color: phaseColor,
                textTransform: "uppercase",
              }}>
                {phaseLabel}
              </span>
            )}
            {coachingPhase && (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                background: "rgba(224,30,30,0.1)",
                border: "1px solid rgba(224,30,30,0.24)",
                borderRadius: 20,
                padding: "2px 10px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.07em",
                color: "rgba(245,237,237,0.72)",
                textTransform: "uppercase",
              }}>
                {coachingPhase}
              </span>
            )}
            {statusLabel && (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                background: "rgba(245,237,237,0.05)",
                border: "1px solid rgba(245,237,237,0.18)",
                borderRadius: 20,
                padding: "2px 10px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.07em",
                color: "rgba(245,237,237,0.45)",
                textTransform: "uppercase",
              }}>
                {statusLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        marginBottom: href ? 14 : 0,
      }}>
        {[
          { label: "Semaine",       value: weekNum != null ? `S${weekNum}`  : "···" },
          { label: "Poids initial", value: weight  != null ? `${weight} kg` : "···" },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: "rgba(0,0,0,0.3)",
            borderRadius: 10,
            padding: "8px 10px",
            textAlign: "center",
          }}>
            <div style={{
              fontSize: 14,
              fontWeight: 800,
              color: (stat as { color?: string }).color ?? "#F5EDED",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}>
              {stat.value}
            </div>
            <div style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(245,237,237,0.28)",
              marginTop: 4,
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Accès explicite à la fiche. La carte entière reste cliquable (rien
          ne change pour qui a l'habitude), mais l'action principale est
          maintenant nommée au lieu d'être devinée. Un Link : Next préchauffe
          la fiche au survol, l'ouverture est quasi instantanée. */}
      {href && (
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(224,30,30,0.1)",
            border: "1px solid rgba(224,30,30,0.22)",
            color: "#F5EDED",
            fontSize: 11.5,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            textDecoration: "none",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.background = "rgba(224,30,30,0.2)";
            el.style.borderColor = "rgba(224,30,30,0.45)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.background = "rgba(224,30,30,0.1)";
            el.style.borderColor = "rgba(224,30,30,0.22)";
          }}
        >
          Voir la fiche
          <ArrowRight size={13} strokeWidth={2.4} />
        </Link>
      )}
    </div>
  );
}
