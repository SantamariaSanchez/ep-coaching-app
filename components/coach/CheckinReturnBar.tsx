"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";

// Pendant un check-in guidé, le coach peut partir modifier le programme ou
// la diète du client : cette barre reste en bas de l'écran pour revenir au
// check-in à l'étape suivante, même s'il navigue entre plusieurs pages.
export const CHECKIN_RETURN_KEY = "ep-checkin-return";

type ReturnTarget = { url: string; name: string };

function readTarget(): ReturnTarget | null {
  try {
    const raw = sessionStorage.getItem(CHECKIN_RETURN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReturnTarget;
    return parsed?.url?.startsWith("/dashboard/coach/") ? parsed : null;
  } catch {
    return null;
  }
}

export default function CheckinReturnBar() {
  const t = useT();
  const pathname = usePathname();
  const [target, setTarget] = useState<ReturnTarget | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- lecture de sessionStorage à chaque changement de page, indisponible au rendu serveur. */
  useEffect(() => {
    const current = readTarget();
    // Sur la page du check-in elle-même, la barre n'a pas lieu d'être.
    if (current && pathname && current.url.split("?")[0] === pathname) {
      setTarget(null);
      return;
    }
    setTarget(current);
  }, [pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!target) return null;

  return (
    <div
      role="region"
      aria-label={t("Retour au check-in")}
      style={{
        position: "fixed", left: 12, right: 12, bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)", zIndex: 60,
        display: "flex", alignItems: "center", gap: 8, maxWidth: 560, margin: "0 auto",
        background: "var(--ep-accent)", color: "var(--ep-strong)", borderRadius: 14,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)", padding: 6,
      }}
    >
      <Link
        href={target.url}
        style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 10px", color: "inherit", textDecoration: "none", fontWeight: 800, fontSize: 13 }}
      >
        <ArrowLeft size={16} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {t("Revenir au check-in de")} {target.name}
        </span>
      </Link>
      <button
        type="button"
        onClick={() => {
          try { sessionStorage.removeItem(CHECKIN_RETURN_KEY); } catch {}
          setTarget(null);
        }}
        aria-label={t("Fermer")}
        style={{ width: 44, height: 44, borderRadius: 10, border: "none", background: "rgba(0,0,0,0.15)", color: "inherit", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
