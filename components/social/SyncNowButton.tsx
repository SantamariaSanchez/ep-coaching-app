"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, History } from "lucide-react";
import { syncNowAction, type SyncNowResult } from "@/app/dashboard/coach/admin/stats-reseaux/actions";

// Bouton "Synchroniser maintenant" : 30 derniers jours, ou remontée de
// l'historique (backfill) par tranches, reprise là où elle s'est arrêtée.

const LABELS: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", linkedin: "LinkedIn", youtube: "YouTube", facebook: "Facebook", threads: "Threads" };
const STATUS: Record<string, string> = { success: "ok", partial: "incomplète", error: "en échec", skipped: "ignorée" };

export default function SyncNowButton({ platform }: { platform: string | null }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<SyncNowResult | null>(null);

  function run(backfill: boolean) {
    setResult(null);
    start(async () => {
      const res = await syncNowAction(platform, backfill);
      setResult(res);
      router.refresh();
    });
  }

  const btn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, fontSize: 11.5, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", cursor: pending ? "wait" : "pointer" };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={pending} onClick={() => run(false)} style={{ ...btn, background: "#E01E1E", color: "#fff", border: "none", opacity: pending ? 0.6 : 1 }}>
          <RefreshCw size={13} className={pending ? "animate-spin" : ""} /> {pending ? t("Synchro en cours...") : t("Synchroniser maintenant")}
        </button>
        <button type="button" disabled={pending} onClick={() => run(true)} style={{ ...btn, background: "transparent", color: "rgba(245,237,237,0.75)", border: "1px solid rgba(137,4,4,0.45)", opacity: pending ? 0.6 : 1 }}>
          <History size={13} />{" "}{t("Remonter l'historique")}
        </button>
      </div>
      {pending && <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.5)", margin: "8px 0 0" }}>{t("Ça peut prendre jusqu'à 4 minutes, reste sur la page.")}</p>}
      {result?.error && <p style={{ fontSize: 12, color: "#fca5a5", margin: "8px 0 0" }}>{result.error}</p>}
      {result?.results && (
        <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none" }}>
          {result.results.map((r) => (
            <li key={r.platform} style={{ fontSize: 12, color: r.status === "success" ? "#4ade80" : r.status === "partial" ? "#facc15" : "#fca5a5", marginBottom: 3 }}>
              {LABELS[r.platform] ?? r.platform} : {STATUS[r.status] ?? r.status}, {r.rows}{" "}{t("ligne")}{r.rows > 1 ? "s" : ""}
              {r.error ? <span style={{ color: "rgba(245,237,237,0.55)" }}> ({r.error.slice(0, 220)})</span> : null}
            </li>
          ))}
          {typeof result.linked === "number" && result.linked > 0 && <li style={{ fontSize: 12, color: "rgba(245,237,237,0.6)" }}>{result.linked}{" "}{t("publication(s) reliée(s) à un script.")}</li>}
        </ul>
      )}
    </div>
  );
}
