"use client";

import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import type { Profile } from "@/utils/auth";
// Import "type" uniquement : purement effacé à la compilation, donc sans
// risque même si lib/coaching-phase.ts importe du code serveur ailleurs
// dans le fichier (même précédent que les imports de type déjà présents
// dans ClientProfileTabs.tsx depuis des modules serveur comme utils/nutrition).
import type { CoachingPhaseSummary } from "@/lib/coaching-phase";
import { ClientCard } from "./ClientCard";

// Semaine de coaching en cours, calculée depuis start_date (déjà chargé avec
// le profil, aucune requête supplémentaire) — même logique que le calcul
// utilisé sur la page de profil client (weeksSince).
function weekNumber(startDate: string | null): number | null {
  if (!startDate) return null;
  const weeks = Math.floor(
    (Date.now() - new Date(startDate + "T12:00:00").getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  return weeks >= 0 ? weeks + 1 : null;
}

export default function ClientsSection({
  clients,
  ouraEligibleIds = [],
  phaseOverview = {},
}: {
  clients: Profile[];
  ouraEligibleIds?: string[];
  phaseOverview?: Record<string, CoachingPhaseSummary>;
}) {
  const router = useRouter();

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <span className="ep-section-title" style={{ marginBottom: 2 }}>Mes clients</span>
          <p style={{ fontSize: 12, color: "rgba(245,237,237,0.3)", margin: 0 }}>
            {clients.length} client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {clients.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 24px",
            background: "linear-gradient(160deg, #180101 0%, #0d0000 100%)",
            border: "1px solid var(--ep-border)",
            borderRadius: "var(--radius-lg)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(224,30,30,0.1)",
              border: "1px solid rgba(224,30,30,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Users size={24} style={{ color: "rgba(224,30,30,0.6)" }} strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#F5EDED", margin: "0 0 6px" }}>
            Aucun client pour l&apos;instant
          </p>
          <p style={{ fontSize: 12, color: "rgba(245,237,237,0.3)", margin: 0 }}>
            Les clients s&apos;inscrivent eux-mêmes depuis l&apos;appli, ils apparaîtront ici. Il ne te reste
            plus qu&apos;à activer leur coaching.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {clients.map((client, i) => (
            <ClientCard
              key={client.id}
              name={client.full_name ?? "Sans nom"}
              phase={null}
              weight={client.weight_start}
              weekNum={weekNumber(client.start_date)}
              delay={i * 60}
              onClick={() => router.push(`/dashboard/coach/clients/${client.id}`)}
              ouraEligible={ouraEligibleIds.includes(client.id)}
              // Nombre de suggestions de phase de coaching en attente
              // (décrochage, prêt à changer de phase...) — voir
              // lib/coaching-phase.ts, jamais affiché côté client.
              alerts={phaseOverview[client.id]?.suggestionCount ?? 0}
            />
          ))}
        </div>
      )}
    </>
  );
}
