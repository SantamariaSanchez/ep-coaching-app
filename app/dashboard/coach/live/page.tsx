import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, Users2, CalendarClock } from "lucide-react";
import { getUser, getProfile, getClients } from "@/utils/auth";
import { getAllLiveEventsForCoach } from "@/utils/live-events";
import { LIVE_TYPE_LABELS } from "@/lib/live-types";
import LiveEventsList from "@/components/live/LiveEventsList";
import FlashRequestsPanel from "@/components/coach/FlashRequestsPanel";
import {
  createLiveEvent, cancelLiveEvent, deleteLiveEvent, updateLiveEvent, updateLiveRecap,
  getPendingFlashRequests,
} from "./actions";

function formatRelativeDate(iso: string): string {
  const target = new Date(iso);
  const diffDays = Math.round((target.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  if (diffDays === 0) return `Aujourd'hui à ${time}`;
  if (diffDays === 1) return `Demain à ${time}`;
  return `${new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(iso))} à ${time}`;
}

export default async function CoachLivePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client/live");

  const [events, clients, flashRequests] = await Promise.all([
    getAllLiveEventsForCoach(user.id),
    getClients(user.id),
    getPendingFlashRequests(),
  ]);

  const now = Date.now();
  const scheduled = events.filter((e) => e.status === "scheduled" && new Date(e.starts_at).getTime() > now);
  const next = scheduled.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0] ?? null;
  const weekEnd = now + 7 * 24 * 60 * 60 * 1000;
  const thisWeekCount = scheduled.filter((e) => new Date(e.starts_at).getTime() <= weekEnd).length;

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Live
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Coaching live</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          1:1, audits, suivi hebdo, accès direct, ateliers... tout ton accompagnement en direct, réuni ici.
        </p>
        <Link
          href="/dashboard/coach/live/disponibilites"
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#E01E1E] mt-2"
        >
          <CalendarClock size={13} />
          Gérer mes disponibilités 1:1 (réservation libre-service)
        </Link>
      </div>

      <div className="ep-card" style={{ padding: "16px 20px", display: "flex", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          <p className="ep-label" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
            <Calendar size={11} /> Prochain live
          </p>
          {next ? (
            <>
              <p style={{ fontSize: 15, fontWeight: 900, color: "#F5EDED", margin: 0 }}>{next.title}</p>
              <p style={{ fontSize: 12, color: "rgba(245,237,237,0.45)", margin: "2px 0 0" }}>
                {formatRelativeDate(next.starts_at)} · {LIVE_TYPE_LABELS[next.type]}
              </p>
            </>
          ) : (
            <p style={{ fontSize: 13, color: "rgba(245,237,237,0.35)", margin: 0 }}>Rien de programmé</p>
          )}
        </div>
        <div>
          <p className="ep-label" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
            <Users2 size={11} /> Cette semaine
          </p>
          <p style={{ fontSize: 20, fontWeight: 900, color: "#F5EDED", margin: 0 }}>{thisWeekCount}</p>
        </div>
        {flashRequests.length > 0 && (
          <div>
            <p className="ep-label" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
              Points flash
            </p>
            <p style={{ fontSize: 20, fontWeight: 900, color: "#E01E1E", margin: 0 }}>{flashRequests.length}</p>
          </div>
        )}
      </div>

      <FlashRequestsPanel requests={flashRequests} />

      <LiveEventsList
        initialEvents={events}
        basePath="/dashboard/coach"
        isCoach={true}
        clients={clients.map((c) => ({ id: c.id, full_name: c.full_name }))}
        onCreate={createLiveEvent}
        onCancel={cancelLiveEvent}
        onDelete={deleteLiveEvent}
        onUpdate={updateLiveEvent}
        onSaveRecap={updateLiveRecap}
      />
    </div>
  );
}
