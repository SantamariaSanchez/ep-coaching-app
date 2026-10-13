interface EPLogoProps {
  size?: "sm" | "md" | "lg";
  showCoaching?: boolean;
}

const SIZES = {
  sm: { ep: "1.8rem",  dot: 6,  coaching: "0.42rem" },
  md: { ep: "2.8rem",  dot: 9,  coaching: "0.58rem" },
  lg: { ep: "4.4rem",  dot: 13, coaching: "0.82rem" },
} as const;

export function EPLogo({ size = "md", showCoaching = true }: EPLogoProps) {
  const s = SIZES[size];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span
        style={{
          fontFamily: "var(--font-playfair, 'Playfair Display'), serif",
          fontStyle: "italic",
          fontWeight: 800,
          fontSize: s.ep,
          color: "var(--ep-ink)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
          textShadow: [
            "2px 2px 0 var(--ep-accent)",
            "4px 4px 0 var(--ep-line)",
            "6px 6px 16px rgba(var(--ep-shade-rgb),0.9)",
            "0 0 40px rgba(var(--ep-accent-rgb),0.25)",
            "0 0 80px rgba(var(--ep-line-rgb),0.12)",
          ].join(", "),
          animation: size === "lg" ? "logoBreathe 4s ease-in-out infinite" : undefined,
        }}
      >
        EP
      </span>
      {showCoaching && (
        <>
          <span style={{
            color: "var(--ep-accent)",
            fontSize: s.dot,
            lineHeight: 1,
            filter: "drop-shadow(0 0 4px rgba(var(--ep-accent-rgb),0.6))",
          }}>
            ◆
          </span>
          <span
            style={{
              fontFamily: "var(--font-montserrat, 'Montserrat'), sans-serif",
              fontWeight: 700,
              fontSize: s.coaching,
              letterSpacing: "0.36em",
              color: "rgba(var(--ep-ink-rgb),0.60)",
              textTransform: "uppercase",
            }}
          >
            COACHING
          </span>
        </>
      )}
    </div>
  );
}
