import { redirect } from "next/navigation";
import Link from "next/link";
import { Video } from "lucide-react";
import { getUser, getProfile, isSubscribed, isClientCapable } from "@/utils/auth";
import { getUpcomingLiveEventsForClient, getPastLiveEventsForClient } from "@/utils/live-events";
import { LIVE_TYPE_LABELS, LIVE_TYPE_INFO, type LiveType } from "@/lib/live-types";
import { LIVE_TYPE_ICONS } from "@/components/live/live-icons";
import LiveEventsList from "@/components/live/LiveEventsList";
import CoachOnlyGate from "@/components/ui/CoachOnlyGate";
import { toggleRsvp } from "./actions";

const INDIVIDUAL_TYPES: LiveType[] = ["1to1", "checkin_hebdo", "audit", "acces_direct"];
const GROUP_TYPES: LiveType[] = ["atelier", "webinaire", "qna"];

function TypeCard({ type }: { type: LiveType }) {
  const Icon = LIVE_TYPE_ICONS[type];
  const info = LIVE_TYPE_INFO[type];
  return (
    <Link
      href={`/dashboard/client/live/format/${type}`}
      className="ep-card"
      style={{
        padding: "14px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        textDecoration: "none",
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 9,
        background: "rgba(224,30,30,0.1)", border: "1px solid rgba(224,30,30,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={15} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#F5EDED" }}>
          {LIVE_TYPE_LABELS[type]}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "rgba(245,237,237,0.4)", lineHeight: 1.4 }}>
          {info.tagline}
        </p>
      </div>
    </Link>
  );
}

export default async function ClientLivePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!isClientCapable(profile)) redirect("/dashboard/coach");
  // Réservé aux clients coachés, les lives étant un canal direct vers le
  // coach. Un coach lui-même suivi par un autre coach (double rôle) n'est
  // jamais soumis à ce paywall entre professionnels (voir Lot 1). Message
  // explicite au lieu d'un redirect silencieux vers /abonnement.
  if (profile?.role !== "coach" && !isSubscribed(profile)) {
    return <CoachOnlyGate icon={Video} title="Coaching live" />;
  }

  // Les lives passés étaient invisibles côté client — seuls les "à venir"
  // (status="scheduled") étaient chargés, la section "Passés" de
  // LiveEventsList ne recevait donc jamais rien à afficher.
  const [upcoming, past] = await Promise.all([
    getUpcomingLiveEventsForClient(user.id, profile?.coach_id ?? null),
    getPastLiveEventsForClient(user.id, profile?.coach_id ?? null),
  ]);
  const events = [...upcoming, ...past];

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Live
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Coaching live</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Tout ton accompagnement en direct avec ton coach : 1:1, suivi hebdo, points flash, ateliers.
        </p>
      </div>

      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Tes rendez-vous individuels
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {INDIVIDUAL_TYPES.map((t) => (
            <TypeCard key={t} type={t} />
          ))}
        </div>
      </div>

      <div className="mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Lives collectifs
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {GROUP_TYPES.map((t) => (
            <TypeCard key={t} type={t} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Mes lives
        </p>
        <LiveEventsList
          initialEvents={events}
          basePath="/dashboard/client"
          isCoach={false}
          onToggleRsvp={toggleRsvp}
        />
      </div>
    </div>
  );
}
