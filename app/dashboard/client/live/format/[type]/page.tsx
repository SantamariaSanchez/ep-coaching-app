import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getUser, getProfile, isSubscribed, isClientCapable } from "@/utils/auth";
import {
  getUpcomingLiveEventsForClient, getPastLiveEventsForClient, getAvailableSlotsForCoach,
} from "@/utils/live-events";
import { LIVE_TYPE_LABELS, LIVE_TYPE_INFO, isLiveType, isOneToOneType, type LiveType } from "@/lib/live-types";
import { LIVE_TYPE_ICONS } from "@/components/live/live-icons";
import SlotPicker from "@/components/client/SlotPicker";
import FlashRequestButton from "@/components/client/FlashRequestButton";
import LiveEventCard from "@/components/live/LiveEventCard";
import BackButton from "@/components/ui/BackButton";
import { toggleRsvp } from "../../actions";

export default async function LiveTypeDetailPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type: rawType } = await params;
  if (!isLiveType(rawType)) notFound();
  const type: LiveType = rawType;

  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!isClientCapable(profile)) redirect("/dashboard/coach");
  if (profile?.role !== "coach" && !isSubscribed(profile)) redirect("/dashboard/client/abonnement");

  const coachId = profile?.coach_id ?? null;
  const info = LIVE_TYPE_INFO[type];
  const Icon = LIVE_TYPE_ICONS[type];
  const needsSlots = info.bookingMode === "self-service" || info.bookingMode === "recurring-self-service";

  const [upcoming, past, slots] = await Promise.all([
    getUpcomingLiveEventsForClient(user.id, coachId),
    getPastLiveEventsForClient(user.id, coachId),
    needsSlots && coachId ? getAvailableSlotsForCoach(coachId) : Promise.resolve([]),
  ]);

  const typeEvents = [...upcoming, ...past].filter((e) => e.type === type);
  const isGroup = !isOneToOneType(type);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <BackButton fallbackHref="/dashboard/client/live" />

      <div className="mb-6 flex items-start gap-3">
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: "rgba(224,30,30,0.1)", border: "1px solid rgba(224,30,30,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={20} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
            Live
          </p>
          <h1 className="text-2xl font-black uppercase tracking-tight">{LIVE_TYPE_LABELS[type]}</h1>
        </div>
      </div>

      <div className="ep-card" style={{ padding: "18px 20px", marginBottom: 16 }}>
        <p style={{ fontSize: 13.5, color: "rgba(245,237,237,0.65)", lineHeight: 1.7, margin: "0 0 14px" }}>
          {info.description}
        </p>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", paddingTop: 14, borderTop: "1px solid rgba(224,30,30,0.1)" }}>
          <div>
            <p className="ep-label" style={{ marginBottom: 3 }}>Format</p>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: "#F5EDED", margin: 0 }}>{info.format}</p>
          </div>
          <div>
            <p className="ep-label" style={{ marginBottom: 3 }}>Cadence</p>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: "#F5EDED", margin: 0 }}>{info.cadence}</p>
          </div>
          <div>
            <p className="ep-label" style={{ marginBottom: 3 }}>Durée</p>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: "#F5EDED", margin: 0 }}>{info.defaultDuration} min</p>
          </div>
        </div>
      </div>

      <div className="ep-card" style={{ padding: "18px 20px", marginBottom: 24 }}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Ce qui est inclus
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {info.includes.map((item) => (
            <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#E01E1E", marginTop: 7, flexShrink: 0 }} />
              <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.6)", margin: 0, lineHeight: 1.5 }}>{item}</p>
            </div>
          ))}
        </div>
      </div>

      {needsSlots && (
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
            {info.bookingMode === "recurring-self-service" ? "Réserver ton suivi hebdomadaire" : "Réserver un créneau"}
          </p>
          {coachId ? (
            <SlotPicker
              coachId={coachId}
              slots={slots}
              mode={info.bookingMode === "recurring-self-service" ? "recurring" : "single"}
            />
          ) : (
            <div className="ep-card" style={{ padding: 20, textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "rgba(245,237,237,0.4)" }}>Aucun coach rattaché pour l&apos;instant.</p>
            </div>
          )}
        </div>
      )}

      {info.bookingMode === "flash-request" && (
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
            Demander un point flash
          </p>
          <p style={{ fontSize: 12, color: "rgba(245,237,237,0.45)", lineHeight: 1.6, marginBottom: 10 }}>
            Ton coach peut aussi te programmer un call stratégique classique à tout moment. Pour un
            besoin plus urgent, envoie-lui une demande de point flash :
          </p>
          <FlashRequestButton />
        </div>
      )}

      {info.bookingMode === "coach-scheduled" && (
        <div className="ep-card mb-6" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <MessageCircle size={18} style={{ color: "#E01E1E", flexShrink: 0 }} />
          <p style={{ flex: 1, fontSize: 12.5, color: "rgba(245,237,237,0.6)", margin: 0, lineHeight: 1.5 }}>
            C&apos;est ton coach qui programme ce format. Une idée de sujet ou une envie particulière ?
          </p>
          <Link
            href="/dashboard/client/messages"
            style={{ fontSize: 11, fontWeight: 700, color: "#E01E1E", whiteSpace: "nowrap", textDecoration: "none" }}
          >
            Lui écrire
          </Link>
        </div>
      )}

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          {typeEvents.length > 0 ? "Tes sessions" : "Aucune session pour l'instant"}
        </p>
        {typeEvents.length > 0 && (
          <div className="space-y-2">
            {typeEvents.map((event) => (
              <LiveEventCard
                key={event.id}
                event={event}
                basePath="/dashboard/client"
                isCoach={false}
                onToggleRsvp={isGroup ? toggleRsvp : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
