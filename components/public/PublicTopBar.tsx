"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { EPLogo } from "@/components/ui/EPLogo";

// Barre du haut des pages publiques (guides, outils, coachs, À propos...).
// Retour d'Emmanuel (2026-11-17) : depuis un guide, impossible de revenir à
// l'accueil, surtout dans l'appli installée où le navigateur n'a pas de bouton
// retour. « Retour » revient à la page d'avant si elle est sur le site, sinon
// à l'accueil ; le logo mène toujours à l'accueil.
export default function PublicTopBar({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();

  function back() {
    let sameSite = false;
    try {
      sameSite = !!document.referrer && new URL(document.referrer).origin === window.location.origin;
    } catch {}
    if (sameSite && window.history.length > 1) router.back();
    else router.push(fallback);
  }

  return (
    <header className="ep-topbar">
      <div className="ep-topbar-in">
        <button type="button" onClick={back} className="ep-topbar-back" aria-label="Revenir à la page précédente">
          <ChevronLeft size={18} strokeWidth={2.4} />
          <span>Retour</span>
        </button>
        <Link href="/" aria-label="EP Coaching, accueil" className="ep-topbar-logo">
          <EPLogo size="sm" showCoaching={false} />
        </Link>
        <Link href="/auth/client" className="ep-topbar-cta">Commencer</Link>
      </div>
    </header>
  );
}
