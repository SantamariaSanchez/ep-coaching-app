"use client";

interface ClientCardProps {
  name: string;
  phase?: string | null;
  weight?: number | null;
  weekNum?: number | null;
  adherence?: number | null;
  alerts?: number;
  href?: string;
  delay?: number;
  onClick?: () => void;
}

export function ClientCard({
  name,
  phase,
  weight,
  weekNum,
  adherence,
  alerts = 0,
  delay = 0,
  onClick,
}: ClientCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const phaseColor =
    phase === "deficit"
      ? "#E01E1E"
      : phase === "surplus"
      ? "#4ade80"
      : "#fb923c";
  const phaseLabel =
    phase === "deficit"
      ? "Déficit"
      : phase === "surplus"
      ? "Surplus"
      : phase
      ? "Maintenance"
      : null;

  return (
    <div
      onClick={onClick}
      className="animate-fade-up"
      style={{
        animationDelay: `${delay}ms`,
        background: "linear-gradient(135deg, #1A0101 0%, #0D0000 100%)",
        border: "1px solid var(--ep-border)",
        borderRadius: 14,
        padding: 20,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!onClick) return;
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(224,30,30,0.35)";
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = "0 12px 40px rgba(224,30,30,0.12)";
      }}
      onMouseLeave={(e) => {
        if (!onClick) return;
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "var(--ep-border)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
      }}
    >
      {/* Top accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent, rgba(224,30,30,0.4), transparent)",
        }}
      />

      {/* Alert badge */}
      {alerts > 0 && (
        <div
          className="animate-pulse-glow"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "#E01E1E",
            color: "#fff",
            borderRadius: "50%",
            width: 20,
            height: 20,
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
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
          }}
        >
          {initials}
        </div>
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "#F5EDED",
              letterSpacing: "-0.02em",
            }}
          >
            {name}
          </div>
          {phaseLabel && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: `${phaseColor}18`,
                border: `1px solid ${phaseColor}30`,
                borderRadius: 20,
                padding: "2px 10px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: phaseColor,
                textTransform: "uppercase",
                marginTop: 4,
              }}
            >
              {phaseLabel}
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}
      >
        {[
          { label: "Semaine", value: weekNum != null ? `S${weekNum}` : "—" },
          { label: "Poids", value: weight != null ? `${weight} kg` : "—" },
          {
            label: "Adhésion",
            value: adherence != null ? `${adherence}%` : "—",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "rgba(0,0,0,0.3)",
              borderRadius: 8,
              padding: "8px 10px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "#F5EDED",
                letterSpacing: "-0.02em",
              }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(245,237,237,0.3)",
                marginTop: 2,
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
