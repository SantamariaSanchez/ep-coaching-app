"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, NotebookPen, Play, RotateCw, Search } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { useStartSession } from "@/hooks/useStartSession";
import type { HomeSession } from "@/lib/client-home";

// Petits morceaux interactifs de l'accueil « Aujourd'hui » (le reste est
// rendu côté serveur, components/client/home/HomeToday.tsx).

/**
 * Note rapide et recherche, dans la ligne du titre de l'accueil : la nav ne
 * pose plus sa petite ligne d'icônes au-dessus (DashboardNav,
 * PAGES_WITH_OWN_TOOLS), plus de 46 px perdus en haut de l'écran.
 */
export function HomeHeaderTools({ base = "/dashboard/client" }: { base?: string }) {
  const t = useT();
  const style: React.CSSProperties = { width: 36, height: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" };
  return (
    <div className="flex md:hidden" style={{ gap: 6, flexShrink: 0 }}>
      <Link prefetch={false} href={`${base}/notes?capture=1`} aria-label={t("Note rapide")} title={t("Note rapide")} className="ep-btn-icon" style={style}>
        <NotebookPen size={16} strokeWidth={1.8} style={{ color: "rgba(var(--ep-ink-rgb),0.6)" }} />
      </Link>
      <button type="button" onClick={() => window.dispatchEvent(new Event("ep:open-search"))} aria-label={t("Rechercher")} title={t("Rechercher")} className="ep-btn-icon" style={style}>
        <Search size={17} strokeWidth={1.8} style={{ color: "rgba(var(--ep-ink-rgb),0.6)" }} />
      </button>
    </div>
  );
}

/** Démarrer / Reprendre la séance du jour du programme, ou « Faite ». */
export function HomeStartSession({
  session,
  compact = false,
  doneHref = "/dashboard/client/logbook",
}: {
  session: HomeSession;
  compact?: boolean;
  doneHref?: string;
}) {
  const t = useT();
  const { start, loading, error } = useStartSession("/dashboard/client/logbook");
  const h = compact ? 38 : 46;
  if (session.state === "done") {
    return (
      <Link
        href={doneHref}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl font-black uppercase tracking-wider"
        style={{ height: h, fontSize: compact ? 11 : 12.5, color: "var(--ep-ok)", background: "rgba(var(--ep-ok-rgb),0.1)", border: "1px solid rgba(var(--ep-ok-rgb),0.3)", textDecoration: "none" }}
      >
        <Check size={compact ? 13 : 15} strokeWidth={3} />
        {t("Séance faite")}
      </Link>
    );
  }
  const resume = session.state === "resume";
  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={() => start({ dayLabel: session.dayLabel, programId: session.programId, muscleGroups: session.muscleGroups })}
        className="w-full flex items-center justify-center gap-2 rounded-xl font-black uppercase tracking-wider bg-(--ep-accent) hover:bg-(--ep-accent-2) text-(--ep-strong) disabled:opacity-50 transition-colors"
        style={{ height: h, fontSize: compact ? 11 : 12.5, boxShadow: compact ? undefined : "0 0 18px rgba(var(--ep-accent-rgb),0.25)" }}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : resume ? (
          <RotateCw size={compact ? 12 : 14} />
        ) : (
          <Play size={compact ? 12 : 14} fill="currentColor" />
        )}
        {loading ? t("Ouverture…") : resume ? (compact ? t("Reprendre") : t("Reprendre la séance")) : compact ? t("Démarrer") : t("Démarrer la séance")}
      </button>
      {error && <p className="mt-1.5 text-xs text-(--ep-bad)">{t(error)}</p>}
    </div>
  );
}

/**
 * L'accueil dépend de l'heure (bloc en cours, prochain repas) : quand
 * l'appli revient au premier plan après un moment, il se recalcule.
 */
export function HomeAutoRefresh({ afterMinutes = 5 }: { afterMinutes?: number }) {
  const router = useRouter();
  const hiddenAt = useRef<number | null>(null);
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > afterMinutes * 60000) router.refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [router, afterMinutes]);
  return null;
}
