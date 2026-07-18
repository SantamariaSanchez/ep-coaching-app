"use client";

import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import type { Profile } from "@/utils/auth";
import { ClientCard } from "./ClientCard";

export default function ClientsSection({
  clients,
  ouraEligibleIds = [],
}: {
  clients: Profile[];
  ouraEligibleIds?: string[];
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
            Les clients s&apos;inscrivent eux-mêmes depuis l&apos;appli, ils apparaîtront ici — il ne te reste
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
              weekNum={null}
              adherence={null}
              alerts={0}
              delay={i * 60}
              onClick={() => router.push(`/dashboard/coach/clients/${client.id}`)}
              ouraEligible={ouraEligibleIds.includes(client.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}
