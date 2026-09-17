"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sun, Moon as MoonIcon, UtensilsCrossed, X, ChevronRight } from "lucide-react";

// REFONTE COMPLÈTE 2026-08-19 (retour direct, après DEUX correctifs
// distincts qui n'ont pas suffi — remontage stable puis sessionStorage —
// et le bilan continuait de "revenir à chaque action" : "corrige ou rend
// le pas obligatoire mais apparaît qu'une seule fois et pas à chaque fois
// que je change d'onglet"). Les deux correctifs précédents partaient du
// principe que le bug venait d'une resynchronisation intempestive de
// l'état — principe qui s'est révélé faux (ou en tout cas insuffisant) en
// conditions réelles malgré deux angles de correction indépendants.
//
// Plutôt que de continuer à chercher un troisième mécanisme de
// resynchronisation caché, ce composant change complètement de modèle
// pour rendre la classe de bug elle-même impossible :
//   - Ce n'est plus un OVERLAY BLOQUANT plein écran (fond flouté,
//     pointer-events bloqués sur le reste de l'appli). C'est une carte de
//     rappel compacte, non bloquante, qui laisse l'appli parfaitement
//     utilisable en dessous.
//   - Il n'y a PLUS AUCUN mécanisme de revérification automatique (plus
//     de re-fetch au changement de route, plus d'événement, plus de
//     minuteur périodique) : plus rien ne peut la faire réapparaître
//     "à chaque action" ou "à chaque changement d'onglet", puisque plus
//     rien ne la réévalue après le premier rendu. Le prochain calcul
//     serveur (lib/daily-gate.ts) n'a lieu qu'au prochain chargement de
//     page complet.
//   - Une fois fermée (croix, ou clic sur le lien pour aller faire le
//     bilan), elle ne réapparaît plus du tout pour cette raison précise
//     tant que la date ne change pas — mémorisé en sessionStorage, donc
//     "apparaît qu'une seule fois" au sens strict, y compris si le
//     composant redémarre pour une raison quelconque.
// Le bilan complet (toutes les cartes, jamais gating) reste accessible à
// tout moment via /dashboard/client/bilan ou /dashboard/coach/moi/bilan
// (voir bilanHref) — cette carte n'est qu'un rappel, plus un verrou.
//
// Retour direct 2026-09-17 ("c'est bien une seule fois mais après enlève-le,
// c'est chiant de mettre la croix à chaque fois") : la clé de fermeture
// incluait la date (`ep-gate-dismissed-${today}-${reason}`) en sessionStorage,
// donc la carte revenait chaque nouveau jour (et même chaque nouvel onglet,
// sessionStorage ne survit pas à la fermeture de l'onglet) réclamer une
// nouvelle croix. Fermeture désormais définitive par type de rappel
// (morning/meal/evening), sans date, en localStorage : une fois fermée une
// fois, elle ne revient plus jamais pour cette raison précise.

export type GateReason = "morning" | "meal" | "evening";
export interface PendingMeal {
  slot: string;
  label: string;
}

const REASON_META: Record<GateReason, { icon: typeof Sun; title: string; subtitle: string }> = {
  morning: {
    icon: Sun,
    title: "Bilan du matin à faire",
    subtitle: "Poids et sommeil, quand tu as deux minutes.",
  },
  meal: {
    icon: UtensilsCrossed,
    title: "Un repas t'attend",
    subtitle: "Un créneau du plan est passé, logue-le quand tu peux.",
  },
  evening: {
    icon: MoonIcon,
    title: "Bilan du soir à faire",
    subtitle: "Pas, digestion, stress, faim : le point avant de dormir.",
  },
};

export default function DailyGateOverlay({
  initialActive,
  initialPendingMeal,
  mealBaseHref,
  bilanHref,
}: {
  initialActive: GateReason | null;
  initialPendingMeal?: PendingMeal;
  mealBaseHref: string;
  bilanHref: string;
}) {
  const pathname = usePathname();

  // Clé par raison seule (plus de date) : une fermeture est définitive pour
  // ce type de rappel, voir commentaire plus haut.
  const storageKey = initialActive ? `ep-gate-dismissed-${initialActive}` : null;
  const [dismissed, setDismissed] = useState(() => {
    if (!storageKey || typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  function dismiss() {
    setDismissed(true);
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Stockage indisponible (navigation privée, quota) : reste fermé
      // pour cette session React, c'est le principal qui compte.
    }
  }

  if (!initialActive || dismissed) return null;
  // Déjà sur la page de destination : pas besoin de le rappeler par-dessus.
  if (initialActive === "meal" && pathname === mealBaseHref) return null;
  if ((initialActive === "morning" || initialActive === "evening") && pathname === bilanHref) return null;

  const meta = REASON_META[initialActive];
  const Icon = meta.icon;
  const href =
    initialActive === "meal" && initialPendingMeal
      ? `${mealBaseHref}?meal=${initialPendingMeal.slot}`
      : bilanHref;
  const subtitle =
    initialActive === "meal" && initialPendingMeal
      ? `C'est passé l'heure du ${initialPendingMeal.label}, logue-le quand tu peux.`
      : meta.subtitle;

  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 1500,
        maxWidth: 420,
        margin: "0 auto",
      }}
      className="ep-card"
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 14px" }}>
        <div
          style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            background: "linear-gradient(135deg, rgba(224,30,30,0.22), rgba(137,4,4,0.12))",
            border: "1px solid rgba(224,30,30,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon size={17} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12.5, fontWeight: 800, color: "#F5EDED", margin: 0 }}>{meta.title}</p>
          <p style={{ fontSize: 11, color: "rgba(245,237,237,0.45)", margin: "3px 0 10px", lineHeight: 1.4 }}>
            {subtitle}
          </p>
          <a
            href={href}
            onClick={dismiss}
            className="ep-btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "7px 12px", textDecoration: "none" }}
          >
            Y aller <ChevronRight size={12} />
          </a>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer"
          title="Fermer"
          style={{
            flexShrink: 0,
            width: 26, height: 26, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(245,237,237,0.06)", border: "1px solid rgba(245,237,237,0.12)",
            color: "rgba(245,237,237,0.4)", cursor: "pointer",
          }}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
