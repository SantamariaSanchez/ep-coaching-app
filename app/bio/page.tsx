import type { Metadata } from "next";
import Link from "next/link";
import {
  Heart,
  Users,
  BookOpen,
  Trophy,
  MessageCircle,
} from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";
import { BRAND_SOCIALS } from "@/lib/brand-links";

export const metadata: Metadata = {
  title: "EP Coaching",
  description: "Tous les liens EP Coaching au même endroit.",
};

// Page "lien en bio" (demande explicite du 2026-08-16) : le goulot
// d'étranglement business identifié n'est pas la conversion (setting/
// closing déjà maîtrisés) mais la visibilité Insta/TikTok — cette page est
// la destination unique du lien en bio, pensée pour du trafic mobile qui
// arrive avec zéro contexte et doit comprendre où cliquer en 2 secondes.
// Volontairement sans nav ni footer de l'appli : une seule colonne de
// choix, rien d'autre à regarder.
const LINKS = [
  {
    href: "/auth/client",
    icon: Heart,
    title: "Rejoindre gratuitement",
    desc: "Accès immédiat, sans engagement",
    primary: true,
  },
  {
    href: "/coachs",
    icon: Users,
    title: "Trouver ton coach",
    desc: "Plusieurs coachs disponibles",
  },
  {
    href: "/reussites",
    icon: Trophy,
    title: "Voir les résultats",
    desc: "De vraies transformations de membres",
  },
  {
    href: "/ressources",
    icon: BookOpen,
    title: "Ressources gratuites",
    desc: "Guides et fiches sans inscription",
  },
];

export default function BioPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "56px 20px 64px",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div
          className="ep-logo-glow animate-fade-up"
          style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}
        >
          <EPLogo size="lg" showCoaching />
        </div>

        <p
          className="animate-fade-up stagger-1"
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "rgba(245,237,237,0.45)",
            fontWeight: 600,
            margin: "0 0 32px",
          }}
        >
          Coaching bodybuilding & nutrition, 100% en ligne
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {LINKS.map(({ href, icon: Icon, title, desc, primary }, i) => (
            <Link
              key={href}
              href={href}
              className={`animate-fade-up stagger-${Math.min(i + 2, 6)} ${primary ? "ep-btn-primary" : "ep-card"}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px 18px",
                borderRadius: "var(--radius-lg)",
                textDecoration: "none",
                width: "100%",
                height: "auto",
                justifyContent: "flex-start",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: primary
                    ? "rgba(255,255,255,0.16)"
                    : "linear-gradient(135deg, rgba(224,30,30,0.18) 0%, rgba(137,4,4,0.10) 100%)",
                  border: primary ? "none" : "1px solid rgba(224,30,30,0.22)",
                }}
              >
                <Icon size={18} strokeWidth={1.9} style={{ color: primary ? "#fff" : "#E01E1E" }} />
              </div>
              <div style={{ textAlign: "left" }}>
                <p
                  style={{
                    fontSize: 13.5,
                    fontWeight: 800,
                    color: primary ? "#fff" : "#F5EDED",
                    margin: 0,
                    letterSpacing: "-0.01em",
                    textTransform: "none",
                  }}
                >
                  {title}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: primary ? "rgba(255,255,255,0.75)" : "rgba(245,237,237,0.35)",
                    margin: "2px 0 0",
                    fontWeight: 500,
                    letterSpacing: "normal",
                    textTransform: "none",
                  }}
                >
                  {desc}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div
          className="animate-fade-up stagger-6"
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            marginTop: 36,
          }}
        >
          <a
            href={BRAND_SOCIALS.whatsapp.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contacter sur WhatsApp"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "1px solid rgba(224,30,30,0.25)",
              color: "rgba(245,237,237,0.5)",
            }}
          >
            <MessageCircle size={17} />
          </a>
        </div>
      </div>
    </div>
  );
}
