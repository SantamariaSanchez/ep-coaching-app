"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight, Eye, Lock } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { computeNav } from "@/components/ui/DashboardNav";
import BackButton from "@/components/ui/BackButton";

// Cadre de l'aperçu « Voir comme mon client » : bandeau, barre d'onglets
// RÉELLE du client (calculée par la même fonction que sa vraie navigation,
// avec sa personnalisation Mon appli et son statut gratuit/coaché), bande des
// sous-rubriques de l'onglet ouvert, puis le contenu rendu inerte (rien n'est
// cliquable, rien ne part en base).

export type PreviewVue = "accueil" | "programme" | "nutrition" | "agenda" | "coach" | "plus";

const VUE_PATH: Record<PreviewVue, string> = {
  accueil: "/dashboard/client",
  programme: "/dashboard/client/program",
  nutrition: "/dashboard/client/nutrition",
  agenda: "/dashboard/client/agenda",
  coach: "/dashboard/client/messages",
  plus: "/dashboard/client/plus",
};

/** Pages du client qu'on sait montrer dans l'aperçu, par segment. */
const SEGMENT_VUE: Record<string, PreviewVue> = {
  program: "programme",
  nutrition: "nutrition",
  agenda: "agenda",
};

export default function ClientPreviewFrame({
  clientId,
  firstName,
  vue,
  isFreeTier,
  showCycle,
  hidden,
  statusLabel,
  notice,
  children,
}: {
  clientId: string;
  firstName: string;
  vue: PreviewVue;
  isFreeTier: boolean;
  showCycle: boolean;
  hidden: string[];
  statusLabel: string;
  /** Précision affichée au-dessus du contenu (ex. fiche de départ pas encore remplie). */
  notice?: string | null;
  children: React.ReactNode;
}) {
  const t = useT();
  const nav = useMemo(
    () => computeNav(VUE_PATH[vue], isFreeTier, showCycle, false, new Set(hidden)),
    [vue, isFreeTier, showCycle, hidden]
  );
  const base = `/dashboard/coach/clients/${clientId}/apercu`;
  const suiviVue: PreviewVue = hidden.includes("nutrition") ? "agenda" : "nutrition";

  function tabVue(href: string): PreviewVue {
    if (href === "/dashboard/client") return "accueil";
    if (href.endsWith("/program") || href.endsWith("/logbook")) return "programme";
    if (href.endsWith("/messages")) return "coach";
    if (href.endsWith("/plus")) return "plus";
    return suiviVue;
  }

  // Onglets « Coach » et « Plus » : leurs pages sont listées telles que le
  // client les voit (cadenas compris pour un membre gratuit).
  const subItems = nav.mobileSubItems;

  return (
    <div className="page-transition" style={{ padding: "20px 12px 48px", maxWidth: 1100, margin: "0 auto" }}>
      <BackButton
        fallbackHref={`/dashboard/coach/clients/${clientId}`}
        expect={`/dashboard/coach/clients/${clientId}`}
        label={t("Retour à sa fiche")}
      />

      {/* Bandeau : on sait toujours qu'on regarde un aperçu, pas son compte. */}
      <div
        role="note"
        style={{
          display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderRadius: 14, marginBottom: 16,
          background: "rgba(var(--ep-accent-rgb),0.1)", border: "1px solid rgba(var(--ep-accent-rgb),0.35)",
        }}
      >
        <Eye size={18} style={{ color: "var(--ep-accent)", flexShrink: 0, marginTop: 2 }} strokeWidth={1.8} />
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: "var(--ep-ink)" }}>
            {t("Aperçu de ce que voit")} {firstName}
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 12, lineHeight: 1.5, color: "rgba(var(--ep-ink-rgb),0.6)" }}>
            {t("Lecture seule : rien n'est cliquable et rien n'est modifié. Ce sont ses vrais onglets, selon sa personnalisation et son statut.")}
          </p>
          <span
            style={{
              display: "inline-block", marginTop: 8, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
              padding: "3px 9px", borderRadius: 999, border: "1px solid rgba(var(--ep-ink-rgb),0.2)", color: "rgba(var(--ep-ink-rgb),0.6)",
            }}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Ses onglets (sur son téléphone : la barre du bas). */}
      <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.4)" }}>
        {t("Ses onglets")}
      </p>
      <nav
        aria-label={t("Onglets du client")}
        style={{
          display: "grid", gridTemplateColumns: `repeat(${nav.tabs.length}, minmax(0, 1fr))`, gap: 4, padding: 4, borderRadius: 16,
          background: "var(--ep-s1)", border: "1px solid rgba(var(--ep-line-rgb),0.25)", marginBottom: 10,
        }}
      >
        {nav.tabs.map((tab) => {
          const Icon = tab.icon;
          const active = nav.isTabActive(tab);
          return (
            <Link
              key={tab.href}
              href={`${base}?vue=${tabVue(tab.href)}`}
              replace
              scroll={false}
              aria-current={active ? "page" : undefined}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 2px", borderRadius: 12,
                textDecoration: "none", minWidth: 0,
                background: active ? "rgba(var(--ep-accent-rgb),0.14)" : "transparent",
                color: active ? "var(--ep-accent)" : "rgba(var(--ep-ink-rgb),0.5)",
              }}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.7} />
              <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                {t(tab.label)}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Sous-rubriques de l'onglet ouvert, comme la bande de son téléphone. */}
      {vue !== "coach" && vue !== "plus" && subItems.length > 0 && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 12 }}>
          {subItems.map((item) => {
            const target = SEGMENT_VUE[item.segment];
            const active = target === vue;
            const pill: React.CSSProperties = {
              display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, padding: "6px 11px", borderRadius: 999,
              fontSize: 11, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
              border: active ? "1px solid rgba(var(--ep-accent-rgb),0.4)" : "1px solid rgba(var(--ep-line-rgb),0.25)",
              background: active ? "rgba(var(--ep-accent-rgb),0.12)" : "transparent",
              color: active ? "var(--ep-accent)" : target ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.4)",
            };
            const Icon = item.icon;
            return target ? (
              <Link key={item.segment} href={`${base}?vue=${target}`} replace scroll={false} style={pill} aria-current={active ? "page" : undefined}>
                <Icon size={12} /> {t(item.label)}
              </Link>
            ) : (
              <span key={item.segment} style={pill} title={t("Visible chez lui, pas encore dans l'aperçu")}>
                <Icon size={12} /> {t(item.label)}
              </span>
            );
          })}
        </div>
      )}

      {notice && (
        <p style={{ margin: "0 0 12px", padding: "10px 12px", borderRadius: 10, fontSize: 12, lineHeight: 1.5, background: "rgba(var(--ep-warn-rgb),0.08)", border: "1px solid rgba(var(--ep-warn-rgb),0.3)", color: "var(--ep-ink)" }}>
          {notice}
        </p>
      )}

      {/* Son écran. `inert` : aucun clic, aucun focus, aucune saisie. */}
      {/* Pleine largeur sur téléphone : l'écran du client garde exactement la
          largeur qu'il a chez lui (ses propres marges comprises). */}
      <div
        className="-mx-3 sm:mx-0 rounded-none sm:rounded-[18px] border-y sm:border border-(--ep-line)/30"
        style={{ background: "var(--ep-bg)", overflow: "hidden", position: "relative" }}
      >
        <div inert aria-label={t("Écran du client, lecture seule")} style={{ userSelect: "none" }}>
          {vue === "coach" ? (
            <div style={{ padding: "24px 16px" }}>
              <p className="ep-section-title">{t("Coach")}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {subItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.segment} className="ep-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px" }}>
                      <Icon size={17} style={{ color: "var(--ep-accent)", flexShrink: 0 }} strokeWidth={1.8} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: "var(--ep-ink)" }}>{t(item.label)}</span>
                      {item.locked && <Lock size={13} style={{ color: "rgba(var(--ep-ink-rgb),0.4)" }} />}
                      <ChevronRight size={14} style={{ color: "rgba(var(--ep-ink-rgb),0.25)" }} />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
