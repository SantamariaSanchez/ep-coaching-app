"use client";

import Link from "next/link";
import {
  Shield,
  Heart,
  ArrowRight,
  Dumbbell,
  Utensils,
  LineChart,
  ClipboardList,
  BookOpen,
  Video,
  Users,
  Activity,
  MessageCircle,
} from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";
import InstallAppHint from "@/components/ui/InstallAppHint";

const FEATURES = [
  { icon: Dumbbell, title: "Programmes", desc: "Plans de musculation sur mesure, adaptés à ton niveau" },
  { icon: Utensils, title: "Nutrition", desc: "Plans alimentaires et recettes personnalisées" },
  { icon: LineChart, title: "Suivi & progression", desc: "Mesures, photos, pesée, courbes d'évolution" },
  { icon: ClipboardList, title: "Logbook séances", desc: "Enregistre tes performances en temps réel" },
  { icon: BookOpen, title: "Formations vidéo", desc: "80h+ de contenu pour progresser sérieusement" },
  { icon: Video, title: "Lives & coaching vidéo", desc: "Sessions en direct avec ton coach" },
  { icon: Activity, title: "Tracker quotidien", desc: "Pas, sommeil, biométrie au jour le jour" },
  { icon: MessageCircle, title: "Messagerie coach", desc: "Contact direct, réponses personnalisées" },
  { icon: Users, title: "Communauté", desc: "Échange avec des membres aussi motivés que toi" },
];

const STATS = [
  { value: "80h+", label: "Formations" },
  { value: "100%", label: "Personnalisé" },
  { value: "∞", label: "Suivi" },
];

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "44px 20px 56px",
        position: "relative",
        zIndex: 1,
        overflow: "hidden",
      }}
    >
      {/* Ambient glows */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "4%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 560,
          height: 560,
          background: "radial-gradient(circle, rgba(var(--color-ep-med-red-rgb),0.22) 0%, transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
          filter: "blur(40px)",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: "0%",
          right: "-10%",
          width: 420,
          height: 420,
          background: "radial-gradient(circle, rgba(124,30,30,0.14) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
          filter: "blur(60px)",
        }}
      />

      <div style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1 }}>

        {/* ── Logo ── */}
        <div
          className="ep-logo-glow animate-fade-up"
          style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}
        >
          <EPLogo size="lg" showCoaching />
        </div>

        {/* ── Badge ── */}
        <div className="animate-fade-up stagger-1" style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <span className="ep-badge-red">Coaching Bodybuilding</span>
        </div>

        {/* ── Headline ── */}
        <div
          className="animate-fade-up stagger-2"
          style={{ textAlign: "center", marginBottom: 14 }}
        >
          <h1
            style={{
              fontFamily: "var(--font-montserrat,'Montserrat'),sans-serif",
              fontWeight: 900,
              fontSize: "clamp(28px, 7vw, 42px)",
              letterSpacing: "-0.05em",
              color: "var(--color-ep-light)",
              margin: "0 0 10px",
              lineHeight: 1.05,
            }}
          >
            TA TRANSFORMATION
            <br />
            <span style={{
              background: "linear-gradient(135deg, var(--color-ep-red) 0%, var(--color-ep-pink) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              COMMENCE ICI
            </span>
          </h1>
          <p
            style={{
              fontSize: 13.5,
              color: "rgba(var(--color-ep-light-rgb),0.40)",
              fontWeight: 500,
              margin: "0 auto",
              maxWidth: 360,
              lineHeight: 1.5,
            }}
          >
            L'espace de coaching bodybuilding tout-en-un : programmes, nutrition, suivi et formations pour progresser sérieusement.
          </p>
        </div>

        {/* ── Stats strip ── */}
        <div
          className="animate-fade-up stagger-3"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
            margin: "26px 0 32px",
          }}
        >
          {STATS.map((s, i) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ textAlign: "center", padding: "0 20px" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "var(--color-ep-light)", letterSpacing: "-0.03em" }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(var(--color-ep-light-rgb),0.30)", marginTop: 2 }}>
                  {s.label}
                </div>
              </div>
              {i < STATS.length - 1 && (
                <div style={{ width: 1, height: 28, background: "rgba(var(--color-ep-red-rgb),0.18)" }} />
              )}
            </div>
          ))}
        </div>

        {/* ── Feature grid ── */}
        <div
          className="animate-fade-up stagger-4"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginBottom: 32,
          }}
        >
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="ep-card"
              style={{
                padding: "16px 10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 8,
                animationDelay: `${i * 35}ms`,
              }}
            >
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, rgba(var(--color-ep-red-rgb),0.18) 0%, rgba(var(--color-ep-dark-red-rgb),0.10) 100%)",
                border: "1px solid rgba(var(--color-ep-red-rgb),0.22)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <Icon size={17} style={{ color: "var(--color-ep-red)" }} strokeWidth={1.9} />
              </div>
              <div>
                <p style={{ fontSize: 11.5, fontWeight: 800, color: "var(--color-ep-light)", margin: "0 0 3px", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                  {title}
                </p>
                <p style={{ fontSize: 9.5, color: "rgba(var(--color-ep-light-rgb),0.32)", margin: 0, lineHeight: 1.35, fontWeight: 500 }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main CTA ── */}
        <div className="animate-fade-up stagger-5">
          <Link
            href="/auth/client"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              width: "100%",
              height: 56,
              background: "linear-gradient(135deg, var(--color-ep-red) 0%, var(--color-ep-med-red) 100%)",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "var(--radius-xl)",
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: "-0.01em",
              boxShadow: "0 12px 32px rgba(var(--color-ep-red-rgb),0.3)",
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
            color: "rgba(var(--color-ep-light-rgb),0.3)",
            fontWeight: 500,
          }}>
            Accès gratuit · Sans engagement
          </p>
        </div>

        {/* ── Coach link ── */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Link
            href="/auth/coach"
            className="animate-fade-up stagger-6"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 32,
              color: "rgba(var(--color-ep-light-rgb),0.25)",
              textDecoration: "none",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <Shield size={12} />
            Espace coach
          </Link>
        </div>

        <InstallAppHint />

        {/* ── Bottom line ── */}
        <p
          className="animate-fade-up stagger-6"
          style={{
            marginTop: 16,
            textAlign: "center",
            fontSize: 10,
            color: "rgba(var(--color-ep-light-rgb),0.12)",
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          EP Coaching · Coaching Bodybuilding & Performance
        </p>
      </div>
    </div>
  );
}
