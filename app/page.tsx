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
  FlaskConical,
  Map,
  UtensilsCrossed,
  Trophy,
} from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";
import InstallAppHint from "@/components/ui/InstallAppHint";

// Ordre pensé comme un argumentaire, pas une simple liste alphabétique de
// modules (retour direct du 2026-08-15 : "le gars qui vient veut une
// transformation, les gros points à mettre en avant c'est la formation et
// l'accompagnement, y'a aussi les audits" — "programme nutrition" seul ne
// vend rien, un vrai humain derrière et un vrai parcours, si). Coaching
// live/audits et formations en tête, le reste (outils de suivi au
// quotidien) ensuite : ce sont des modules réels et utiles, juste pas ce
// qui fait venir quelqu'un.
const FEATURES = [
  { icon: Video, title: "Coaching live", desc: "1:1, audits, suivi hebdo, ateliers, webinaires, Q&A avec un vrai coach" },
  { icon: BookOpen, title: "5 formations complètes", desc: "Bodybuilding, nutrition, training, business, psychologie" },
  { icon: MessageCircle, title: "Messagerie coach", desc: "Contact direct, réponses personnalisées, jamais un chatbot" },
  { icon: LineChart, title: "Suivi & progression", desc: "Mesures, photos, pesée, courbes d'évolution" },
  { icon: Dumbbell, title: "Programmes", desc: "Plans de musculation sur mesure, adaptés à ton niveau" },
  { icon: Utensils, title: "Nutrition", desc: "Plans alimentaires et calcul de macros personnalisé" },
  { icon: ClipboardList, title: "Logbook séances", desc: "Enregistre tes performances en temps réel" },
  { icon: Activity, title: "Tracker quotidien", desc: "Pas, sommeil, biométrie au jour le jour" },
  { icon: Users, title: "Communauté", desc: "Échange avec des membres aussi motivés que toi" },
  { icon: FlaskConical, title: "Science & recherche", desc: "Études et actualité sourcées, sans blabla" },
  { icon: Map, title: "Road Map", desc: "Tes objectifs et les étapes pour les atteindre" },
  { icon: UtensilsCrossed, title: "Recettes", desc: "Des idées de repas healthy et gourmands" },
];

const STATS = [
  { value: "5", label: "Formations" },
  { value: "7", label: "Formats live" },
  { value: "100%", label: "Personnalisé" },
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
              color: "#F5EDED",
              margin: "0 0 10px",
              lineHeight: 1.05,
            }}
          >
            TA TRANSFORMATION
            <br />
            <span style={{
              background: "linear-gradient(135deg, #E01E1E 0%, #FDC4C4 100%)",
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
              color: "rgba(245,237,237,0.40)",
              fontWeight: 500,
              margin: "0 auto",
              maxWidth: 360,
              lineHeight: 1.5,
            }}
          >
            Un vrai accompagnement, pas une appli de plus : coaching live, audits, formations complètes et un coach qui répond vraiment.
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
                <div style={{ fontSize: 22, fontWeight: 900, color: "#F5EDED", letterSpacing: "-0.03em" }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.30)", marginTop: 2 }}>
                  {s.label}
                </div>
              </div>
              {i < STATS.length - 1 && (
                <div style={{ width: 1, height: 28, background: "rgba(224,30,30,0.18)" }} />
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
                background: "linear-gradient(135deg, rgba(224,30,30,0.18) 0%, rgba(137,4,4,0.10) 100%)",
                border: "1px solid rgba(224,30,30,0.22)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <Icon size={17} style={{ color: "#E01E1E" }} strokeWidth={1.9} />
              </div>
              <div>
                <p style={{ fontSize: 11.5, fontWeight: 800, color: "#F5EDED", margin: "0 0 3px", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                  {title}
                </p>
                <p style={{ fontSize: 9.5, color: "rgba(245,237,237,0.32)", margin: 0, lineHeight: 1.35, fontWeight: 500 }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Preuve sociale, juste avant l'appel à l'action (retour direct
            2026-08-16 : augmenter le taux d'inscription). Pas de chiffre
            de membres inventé ou gonflé (12 clients réels à ce jour, pas de
            quoi impressionner) : le lien vers /reussites, lui, est honnête
            et vérifiable, ce sont de vraies transformations publiées avec
            l'accord explicite de leur auteur. ── */}
        <Link
          href="/reussites"
          className="animate-fade-up stagger-4"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            marginBottom: 18,
            padding: "10px 16px",
            borderRadius: "var(--radius-md)",
            background: "rgba(224,30,30,0.08)",
            border: "1px solid rgba(224,30,30,0.2)",
            color: "#F5EDED",
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <Trophy size={14} style={{ color: "#E01E1E" }} />
          Voir de vraies transformations de membres
        </Link>

        {/* ── Main CTA ── */}
        <div className="animate-fade-up stagger-5">
          <Link
            href="/auth/client"
            className="ep-btn-primary"
            style={{
              width: "100%",
              height: 56,
              borderRadius: "var(--radius-xl)",
              fontSize: 13,
              textDecoration: "none",
            }}
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
            Accès gratuit · Sans engagement
          </p>

          {/* Axe 5 (VISION.md) : plusieurs coachs sur la plateforme
              maintenant, pas seulement celui par défaut — un visiteur
              indécis doit pouvoir choisir avant de s'inscrire. Grossi et
              passé en doré (retour direct 2026-08-17) : cette page sert
              désormais de destination pour le lien en bio, ces deux liens
              secondaires méritent plus de poids visuel. */}
          <Link
            href="/coachs"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginTop: 14,
              fontSize: 13,
              fontWeight: 800,
              color: "#fbbf24",
              textDecoration: "none",
            }}
          >
            <Users size={14} /> Plusieurs coachs disponibles, trouve le tien
          </Link>

          {/* Chemin de repli pour un visiteur pas encore prêt à créer un
              compte : plutôt que de le perdre, un lead magnet gratuit sans
              inscription capture son email pour une relance plus tard (voir
              LEADMAGNETS.md). Jusqu'ici la page d'accueil ne renvoyait
              jamais vers /ressources du tout. */}
          <Link
            href="/ressources"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginTop: 10,
              fontSize: 13,
              fontWeight: 800,
              color: "#fbbf24",
              textDecoration: "none",
            }}
          >
            <BookOpen size={14} /> Pas encore prêt(e) ? Ressources gratuites sans inscription
          </Link>
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
              color: "rgba(245,237,237,0.7)",
              textDecoration: "none",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            <Shield size={17} />
            Espace coach
          </Link>
        </div>

        <InstallAppHint />

        {/* ── Legal links ── */}
        <div
          className="animate-fade-up stagger-6"
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 14,
            marginTop: 20,
          }}
        >
          {[
            { href: "/legal/cgu", label: "CGU" },
            { href: "/legal/cgv", label: "CGV" },
            { href: "/legal/confidentialite", label: "Confidentialité" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{ color: "#E01E1E", textDecoration: "none", fontSize: 12.5, fontWeight: 600 }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* ── Bottom line ── */}
        <p
          className="animate-fade-up stagger-6"
          style={{
            marginTop: 16,
            textAlign: "center",
            fontSize: 10,
            color: "rgba(245,237,237,0.12)",
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
