"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore, type CSSProperties } from "react";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { goBack, isFromVitrine, previousInAppUrl } from "@/lib/nav-trail";

// Bouton « Retour » partagé (voir lib/nav-trail.ts) : revient vraiment à la
// page d'avant (liste filtrée, onglet précis, site vitrine), et n'ouvre
// `fallbackHref` que s'il n'y a rien derrière.
//
// - `expect` : ne revient en arrière que si la page précédente est ce chemin
//   (ou l'un de ces chemins), sinon ouvre `fallbackHref` (utile quand le libellé annonce une
//   destination précise, ex. « Tous les clients »).
// - `siteLabel` : libellé affiché quand on arrive du site vitrine.
const noopSubscribe = () => () => {};

export default function BackButton({
  fallbackHref,
  label,
  expect,
  siteLabel,
  variant = "caps",
  icon = "chevron",
  className,
  style,
  iconSize,
}: {
  fallbackHref: string;
  label?: string;
  expect?: string | string[];
  siteLabel?: string;
  variant?: "caps" | "plain";
  icon?: "chevron" | "arrow";
  className?: string;
  style?: CSSProperties;
  /** Taille de l'icône (bouton icône seule : label=""). */
  iconSize?: number;
}) {
  const t = useT();
  const router = useRouter();
  // Lu après hydratation seulement (document.referrer / sessionStorage
  // n'existent pas côté serveur) : premier rendu identique au serveur.
  const fromSite = useSyncExternalStore(
    noopSubscribe,
    () => !!siteLabel && !previousInAppUrl() && isFromVitrine(),
    () => false
  );
  const text = fromSite && siteLabel ? siteLabel : label ?? t("Retour");
  const Icon = icon === "arrow" ? ArrowLeft : ChevronLeft;

  const base =
    variant === "caps"
      ? "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-(--ep-ink)/40 hover:text-(--ep-ink)/70 transition-colors mb-6"
      : "inline-flex items-center gap-1.5 text-[13px] font-bold text-(--ep-ink)/55 hover:text-(--ep-ink)/80 transition-colors";

  return (
    <button
      type="button"
      onClick={() => goBack(router, fallbackHref, expect)}
      aria-label={text ? undefined : t("Retour")}
      className={className ?? base}
      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", minHeight: 32, ...style }}
    >
      <Icon size={iconSize ?? (variant === "caps" ? 14 : 16)} />
      {text}
    </button>
  );
}
