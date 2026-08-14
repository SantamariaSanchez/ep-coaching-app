import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { getCoachInbox } from "@/lib/coach-inbox";
import { ClipboardCheck, Dumbbell, Camera, ChevronRight, Inbox as InboxIcon } from "lucide-react";

const TYPE_ICON = { checkin: ClipboardCheck, correction: Dumbbell, photo: Camera } as const;

function relativeTime(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `Il y a ${weeks} semaine${weeks > 1 ? "s" : ""}`;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(iso));
}

export const dynamic = "force-dynamic";

// Boîte de réception coach unique (item 8 du chantier 50 idées) : bilans,
// corrections technique et photos de suivi qui attendent une réponse,
// regroupés en une seule vue triée par ancienneté — avant, il fallait
// ouvrir chaque fiche client une par une pour savoir ce qui traînait.
export default async function CoachInboxPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client");

  const items = await getCoachInbox(user.id);

  return (
    <div className="page-transition ep-page-wide" style={{ padding: "32px 24px 48px", maxWidth: 720 }}>
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Gestion</p>
        <h1 className="ep-h1">Boîte de réception</h1>
        <p style={{ marginTop: 6, fontSize: 12, color: "rgba(245,237,237,0.3)", fontWeight: 500 }}>
          {items.length === 0 ? "Rien en attente" : `${items.length} point${items.length > 1 ? "s" : ""} à traiter`}
        </p>
      </div>

      {items.length === 0 ? (
        <div
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "48px 24px",
            background: "linear-gradient(160deg, #180101 0%, #0d0000 100%)",
            border: "1px solid var(--ep-border)",
            borderRadius: "var(--radius-lg)",
            textAlign: "center",
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
          }}>
            <InboxIcon size={24} style={{ color: "#4ade80" }} strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#F5EDED", margin: "0 0 6px" }}>
            Tu es à jour
          </p>
          <p style={{ fontSize: 12, color: "rgba(245,237,237,0.3)", margin: 0 }}>
            Aucun bilan, correction ou photo en attente de réponse.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item) => {
            const Icon = TYPE_ICON[item.type];
            return (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.href}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px", borderRadius: 12,
                  background: "linear-gradient(160deg, #180101 0%, #0d0000 100%)",
                  border: "1px solid rgba(224,30,30,0.09)",
                  textDecoration: "none",
                  transition: "border-color 0.15s ease",
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: "rgba(224,30,30,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={15} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: "#F5EDED", margin: "0 0 2px" }}>
                    {item.clientName}
                  </p>
                  <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.4)", margin: 0 }}>
                    {item.detail}
                  </p>
                </div>
                <span style={{ fontSize: 10.5, color: "rgba(245,237,237,0.28)", fontWeight: 600, flexShrink: 0 }}>
                  {relativeTime(item.createdAt)}
                </span>
                <ChevronRight size={14} style={{ color: "rgba(245,237,237,0.2)", flexShrink: 0 }} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
