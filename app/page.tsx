"use client";

import Link from "next/link";
import { Shield, Heart, ArrowRight, Zap, Target, TrendingUp } from "lucide-react";
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
          L'espace coaching musculation : programmes, nutrition, suivi & communauté
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
          { icon: Target, label: "Programmes" },
          { icon: Zap,    label: "Nutrition" },
          { icon: TrendingUp, label: "Suivi" },
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

      {/* ── Main CTA ── */}
      <div
        className="animate-fade-up stagger-4"
        style={{
          width: "100%",
          maxWidth: 400,
          position: "relative",
          zIndex: 1,
        }}
      >
        <Link
          href="/auth/client"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            width: "100%",
            height: 56,
            background: "linear-gradient(135deg, #E01E1E 0%, #B00202 100%)",
            color: "#fff",
            textDecoration: "none",
            borderRadius: "var(--radius-xl)",
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: "-0.01em",
            boxShadow: "0 12px 32px rgba(224,30,30,0.3)",
            transition: "transform 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <Heart size={18} strokeWidth={2} />
          Rejoindre la communauté
          <ArrowRight size={16} />
        </Link>

        <p style={{
          textAlign: "center",
          marginTop: 14,
          fontSize: 11,
          color: "rgba(245,237,237,0.3)",
          fontWeight: 500,
        }}>
          Gratuit — programmes, nutrition, suivi, logbook & communauté
        </p>
      </div>

      {/* ── Coach link ── */}
      <Link
        href="/auth/coach"
        className="animate-fade-up stagger-5"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginTop: 32,
          color: "rgba(245,237,237,0.25)",
          textDecoration: "none",
          fontSize: 11,
          fontWeight: 600,
          position: "relative",
          zIndex: 1,
        }}
      >
        <Shield size={12} />
        Espace coach
      </Link>

      {/* ── Bottom line ── */}
      <p
        className="animate-fade-up stagger-5"
        style={{
          marginTop: 16,
          fontSize: 10,
          color: "rgba(245,237,237,0.12)",
          fontWeight: 600,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          position: "relative",
          zIndex: 1,
        }}
      >
        EP Coaching · Coaching Musculation & Performance
      </p>
    </div>
  );
}
