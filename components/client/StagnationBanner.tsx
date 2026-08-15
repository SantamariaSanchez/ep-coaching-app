"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PhoneCall } from "lucide-react";

interface StagnationStatus {
  active: boolean;
  daysSince?: number;
  hasCoach?: boolean;
}

// Bannière persistante (pas une notif qu'on swipe une fois) pour les
// clients relancés par le cron anti-stagnation (voir app/api/cron/
// stagnation-escalation) qui n'ont toujours pas réservé d'appel derrière.
// Reste visible tant que /api/client/stagnation-status répond active:true —
// contrairement à une notification push, impossible à manquer en ouvrant
// le tableau de bord. Demande explicite du 2026-08-15 : "l'appli doit
// aller chercher le client... pas juste une notif qui sert qu'à amener
// dans l'agenda".
export default function StagnationBanner() {
  const [status, setStatus] = useState<StagnationStatus | null>(null);

  useEffect(() => {
    fetch("/api/client/stagnation-status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status?.active || !status.hasCoach) return null;

  return (
    <section className="animate-fade-up stagger-1" style={{ marginBottom: 24 }}>
      <div
        className="ep-card-highlighted"
        style={{
          padding: "20px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          borderColor: "rgba(224,30,30,0.35)",
        }}
      >
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>
            On dirait que ça coince depuis {status.daysSince}j
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(245,237,237,0.5)", lineHeight: 1.6 }}>
            Ton coach a été prévenu, mais un vrai échange règle toujours plus vite les choses
            qu&apos;une appli. Réserve un créneau, ça prend deux minutes.
          </p>
        </div>
        <Link
          href="/dashboard/client/live/reserver"
          className="ep-btn-primary"
          style={{ textDecoration: "none", fontSize: 10.5, padding: "10px 16px", display: "inline-flex", alignItems: "center", gap: 6, width: "fit-content" }}
        >
          <PhoneCall size={13} strokeWidth={2} />
          Réserver un appel avec mon coach
        </Link>
      </div>
    </section>
  );
}
