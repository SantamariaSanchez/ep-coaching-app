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
          color: "var(--color-ep-light)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
          textShadow: [
            "2px 2px 0 var(--color-ep-red)",
            "4px 4px 0 var(--color-ep-dark-red)",
            "6px 6px 16px rgba(0,0,0,0.9)",
            "0 0 40px rgba(var(--color-ep-red-rgb),0.25)",
            "0 0 80px rgba(var(--color-ep-dark-red-rgb),0.12)",
          ].join(", "),
          animation: size === "lg" ? "logoBreathe 4s ease-in-out infinite" : undefined,
        }}
      >
        EP
      </span>
      {showCoaching && (
        <>
          <span style={{
            color: "var(--color-ep-red)",
            fontSize: s.dot,
            lineHeight: 1,
            filter: "drop-shadow(0 0 4px rgba(var(--color-ep-red-rgb),0.6))",
          }}>
            ◆
          </span>
          <span
            style={{
              fontFamily: "var(--font-montserrat, 'Montserrat'), sans-serif",
              fontWeight: 700,
              fontSize: s.coaching,
              letterSpacing: "0.36em",
              color: "rgba(var(--color-ep-light-rgb),0.60)",
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
