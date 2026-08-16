import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Heart } from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";
import { getActiveCampaignPage } from "@/lib/campaign-pages";
import { createAdminClient } from "@/lib/supabase-admin";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getActiveCampaignPage(slug);
  return { title: page ? `${page.headline} | EP Coaching` : "EP Coaching" };
}

// Landing page dédiée par campagne (demande explicite 2026-08-16) : un
// seul message, un seul CTA, pensée pour un lien de bio/description
// spécifique à une vidéo/campagne plutôt que la page d'accueil générique.
// Visiteur toujours anonyme ici (aucune session possible) : lecture et
// incrément de vue passent par le client admin, jamais par une policy
// select publique (voir supabase/migrations/20260816c_campaign_pages.sql).
export default async function CampaignPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getActiveCampaignPage(slug);
  if (!page) notFound();

  // Compteur de vues, best effort : une imprécision occasionnelle (double
  // compte, requête concurrente) n'a aucune conséquence fonctionnelle, ne
  // vaut pas la peine d'une transaction dédiée.
  createAdminClient()
    .from("campaign_pages")
    .update({ view_count: page.view_count + 1 })
    .eq("id", page.id)
    .then(() => {});

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "56px 20px",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
        <div className="ep-logo-glow animate-fade-up" style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <EPLogo size="lg" showCoaching />
        </div>

        <h1
          className="animate-fade-up stagger-1"
          style={{
            fontFamily: "var(--font-montserrat,'Montserrat'),sans-serif",
            fontWeight: 900,
            fontSize: "clamp(26px, 7vw, 40px)",
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            margin: "0 0 14px",
            background: "linear-gradient(135deg, #F5EDED 0%, #FDC4C4 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {page.headline}
        </h1>

        {page.subheadline && (
          <p
            className="animate-fade-up stagger-2"
            style={{
              fontSize: 14,
              color: "rgba(245,237,237,0.45)",
              fontWeight: 500,
              lineHeight: 1.55,
              margin: "0 auto 32px",
              maxWidth: 380,
            }}
          >
            {page.subheadline}
          </p>
        )}

        <Link
          href={page.cta_href}
          className="ep-btn-primary animate-fade-up stagger-3"
          style={{ width: "100%", height: 56, borderRadius: "var(--radius-xl)", fontSize: 13, textDecoration: "none" }}
        >
          <Heart size={18} strokeWidth={2} />
          {page.cta_label}
          <ArrowRight size={16} />
        </Link>

        <p className="animate-fade-up stagger-4" style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "rgba(245,237,237,0.3)", fontWeight: 500 }}>
          Accès gratuit · Sans engagement
        </p>
      </div>
    </div>
  );
}
