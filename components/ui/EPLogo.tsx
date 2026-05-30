interface EPLogoProps {
  size?: "sm" | "md" | "lg";
  showCoaching?: boolean;
}

const SIZES = {
  sm: { ep: "1.8rem",  dot: 6,  coaching: "0.45rem" },
  md: { ep: "2.6rem",  dot: 9,  coaching: "0.60rem" },
  lg: { ep: "4.0rem",  dot: 12, coaching: "0.85rem" },
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
          color: "#F5EDED",
          lineHeight: 1,
          textShadow: "2px 2px 0 #E01E1E, 4px 4px 0 #890404, 6px 6px 12px rgba(0,0,0,0.8)",
          letterSpacing: "-0.02em",
        }}
      >
        EP
      </span>
      {showCoaching && (
        <>
          <span style={{ color: "#E01E1E", fontSize: s.dot, lineHeight: 1 }}>◆</span>
          <span
            style={{
              fontFamily: "var(--font-montserrat, 'Montserrat'), sans-serif",
              fontWeight: 700,
              fontSize: s.coaching,
              letterSpacing: "0.32em",
              color: "rgba(245,237,237,0.7)",
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
