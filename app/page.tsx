"use client";

import Link from "next/link";
import { Shield, User, ArrowRight, Zap, Target, TrendingUp } from "lucide-react";
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
        padding: "40px 24px 48px",
        position: "relative",
        zIndex: 1,
        overflow: "hidden",
      }}
    >
      {/* Extra local glow behind logo */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 500,
          height: 500,
          background: "radial-gradient(circle, rgba(176,2,2,0.22) 0%, transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
          filter: "blur(40px)",
        }}
      />

      {/* ── Logo ── */}
      <div
        className="ep-logo-glow animate-fade-up"
        style={{ marginBottom: 36, position: "relative", zIndex: 1 }}
      >
        <EPLogo size="lg" showCoaching />
      </div>

      {/* ── Headline ── */}
      <div
        className="animate-fade-up stagger-2"
        style={{ textAlign: "center", marginBottom: 12, position: "relative", zIndex: 1 }}
      >
        <h1
          style={{
            fontFamily: "var(--font-montserrat,'Montserrat'),sans-serif",
            fontWeight: 900,
            fontSize: "clamp(26px, 6vw, 40px)",
            letterSpacing: "-0.05em",
            color: "#F5EDED",
            margin: "0 0 10px",
            lineHeight: 1.05,
          }}
        >
          TON CORPS.
          <br />
          <span style={{
            background: "linear-gradient(135deg, #E01E1E 0%, #FDC4C4 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            TES RÈGLES.
          </span>
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "rgba(245,237,237,0.35)",
            fontWeight: 500,
            margin: 0,
            letterSpacing: "0.04em",
          }}
        >
          Coaching personnalisé haut de gamme
        </p>
      </div>

      {/* ── 3 pilliers ── */}
      <div
        className="animate-fade-up stagger-3"
        style={{
          display: "flex",
          gap: 24,
          marginBottom: 48,
          position: "relative",
          zIndex: 1,
        }}
      >
        {[
          { icon: Target, label: "Objectifs" },
          { icon: Zap,    label: "Intensité" },
          { icon: TrendingUp, label: "Résultats" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon size={16} style={{ color: "rgba(224,30,30,0.7)" }} strokeWidth={2} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,237,237,0.25)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Access cards ── */}
      <div
        className="animate-fade-up stagger-4"
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          justifyContent: "center",
          width: "100%",
          maxWidth: 480,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Coach card */}
        <Link
          href="/auth/coach"
          style={{
            flex: "1 1 180px",
            textDecoration: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            padding: "28px 20px",
            background: "rgba(16,1,1,0.60)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(224,30,30,0.14)",
            borderRadius: "var(--radius-xl)",
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.5)",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.borderColor = "rgba(224,30,30,0.45)";
            el.style.transform = "translateY(-5px) scale(1.01)";
            el.style.boxShadow = "0 24px 64px rgba(0,0,0,0.65), 0 0 60px rgba(137,4,4,0.12), inset 0 1px 0 rgba(255,255,255,0.06)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.borderColor = "rgba(224,30,30,0.14)";
            el.style.transform = "translateY(0) scale(1)";
            el.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.5)";
          }}
        >
          {/* Card top shimmer */}
          <div style={{
            position: "absolute",
            top: 0, left: "15%", right: "15%",
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(224,30,30,0.5), transparent)",
          }} />
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, rgba(224,30,30,0.15) 0%, rgba(137,4,4,0.08) 100%)",
              border: "1px solid rgba(224,30,30,0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "inset 0 1px 0 rgba(224,30,30,0.2), 0 4px 16px rgba(0,0,0,0.3)",
            }}
          >
            <Shield size={22} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 900, fontSize: 17, color: "#F5EDED", margin: "0 0 4px", letterSpacing: "-0.03em" }}>
              Coach
            </p>
            <p style={{ fontSize: 11, color: "rgba(245,237,237,0.30)", margin: 0, fontWeight: 500 }}>
              Espace privé
            </p>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: "rgba(224,30,30,0.5)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
          }}>
            ACCÉDER <ArrowRight size={10} />
          </div>
        </Link>

        {/* Client card */}
        <Link
          href="/auth/client"
          style={{
            flex: "1 1 180px",
            textDecoration: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            padding: "28px 20px",
            background: "rgba(16,1,1,0.60)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(224,30,30,0.14)",
            borderRadius: "var(--radius-xl)",
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.5)",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.borderColor = "rgba(224,30,30,0.45)";
            el.style.transform = "translateY(-5px) scale(1.01)";
            el.style.boxShadow = "0 24px 64px rgba(0,0,0,0.65), 0 0 60px rgba(137,4,4,0.12), inset 0 1px 0 rgba(255,255,255,0.06)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.borderColor = "rgba(224,30,30,0.14)";
            el.style.transform = "translateY(0) scale(1)";
            el.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.5)";
          }}
        >
          <div style={{
            position: "absolute",
            top: 0, left: "15%", right: "15%",
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(224,30,30,0.5), transparent)",
          }} />
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, rgba(224,30,30,0.15) 0%, rgba(137,4,4,0.08) 100%)",
              border: "1px solid rgba(224,30,30,0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "inset 0 1px 0 rgba(224,30,30,0.2), 0 4px 16px rgba(0,0,0,0.3)",
            }}
          >
            <User size={22} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 900, fontSize: 17, color: "#F5EDED", margin: "0 0 4px", letterSpacing: "-0.03em" }}>
              Client
            </p>
            <p style={{ fontSize: 11, color: "rgba(245,237,237,0.30)", margin: 0, fontWeight: 500 }}>
              Mon espace coaching
            </p>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: "rgba(224,30,30,0.5)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
          }}>
            ACCÉDER <ArrowRight size={10} />
          </div>
        </Link>
      </div>

      {/* ── Bottom line ── */}
      <p
        className="animate-fade-up stagger-5"
        style={{
          marginTop: 40,
          fontSize: 10,
          color: "rgba(245,237,237,0.12)",
          fontWeight: 600,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          position: "relative",
          zIndex: 1,
        }}
      >
        EP Coaching · Performance & Résultats
      </p>
    </div>
  );
}
