"use client";
import Link from "next/link";
import { Shield, User } from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Logo */}
      <div className="animate-fade-up" style={{ marginBottom: 32 }}>
        <EPLogo size="lg" showCoaching />
      </div>

      {/* Headline */}
      <div
        className="animate-fade-up stagger-2"
        style={{ textAlign: "center", marginBottom: 48 }}
      >
        <h1
          style={{
            fontFamily: "var(--font-montserrat,'Montserrat'),sans-serif",
            fontWeight: 800,
            fontSize: "clamp(22px, 5vw, 32px)",
            letterSpacing: "-0.04em",
            color: "#F5EDED",
            margin: "0 0 10px",
          }}
        >
          TON ESPACE COACHING
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "rgba(245,237,237,0.4)",
            fontWeight: 500,
            margin: 0,
          }}
        >
          Accède à ton espace personnel
        </p>
      </div>

      {/* Cards */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          justifyContent: "center",
          width: "100%",
          maxWidth: 520,
        }}
      >
        {/* Card Coach */}
        <Link
          href="/auth/coach"
          className="animate-fade-up stagger-3"
          style={{
            flex: "1 1 200px",
            textDecoration: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            padding: "32px 24px",
            background: "rgba(22,2,2,0.55)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(224,30,30,0.14)",
            borderRadius: "var(--radius-xl)",
            cursor: "pointer",
            transition: "all 0.25s ease",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.borderColor = "rgba(224,30,30,0.4)";
            el.style.transform = "translateY(-4px)";
            el.style.boxShadow = "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(224,30,30,0.12), inset 0 1px 0 rgba(255,255,255,0.06)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.borderColor = "rgba(224,30,30,0.14)";
            el.style.transform = "translateY(0)";
            el.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)";
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(224,30,30,0.1)",
              border: "1px solid rgba(224,30,30,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Shield size={24} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontWeight: 800,
                fontSize: 18,
                color: "#F5EDED",
                margin: "0 0 4px",
                letterSpacing: "-0.02em",
              }}
            >
              Coach
            </p>
            <p
              style={{
                fontSize: 12,
                color: "rgba(245,237,237,0.35)",
                margin: 0,
                fontWeight: 500,
              }}
            >
              Espace privé
            </p>
          </div>
        </Link>

        {/* Card Client */}
        <Link
          href="/auth/client"
          className="animate-fade-up stagger-4"
          style={{
            flex: "1 1 200px",
            textDecoration: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            padding: "32px 24px",
            background: "rgba(22,2,2,0.55)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(224,30,30,0.14)",
            borderRadius: "var(--radius-xl)",
            cursor: "pointer",
            transition: "all 0.25s ease",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.borderColor = "rgba(224,30,30,0.4)";
            el.style.transform = "translateY(-4px)";
            el.style.boxShadow = "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(224,30,30,0.12), inset 0 1px 0 rgba(255,255,255,0.06)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.borderColor = "rgba(224,30,30,0.14)";
            el.style.transform = "translateY(0)";
            el.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)";
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(224,30,30,0.1)",
              border: "1px solid rgba(224,30,30,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <User size={24} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontWeight: 800,
                fontSize: 18,
                color: "#F5EDED",
                margin: "0 0 4px",
                letterSpacing: "-0.02em",
              }}
            >
              Client
            </p>
            <p
              style={{
                fontSize: 12,
                color: "rgba(245,237,237,0.35)",
                margin: 0,
                fontWeight: 500,
              }}
            >
              Rejoindre le coaching
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
