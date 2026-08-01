import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarPlus, Repeat, Zap, GraduationCap } from "lucide-react";
import { getUser, getProfile, isSubscribed, isClientCapable } from "@/utils/auth";
import { getUpcomingLiveEventsForClient, getPastLiveEventsForClient } from "@/utils/live-events";
import LiveEventsList from "@/components/live/LiveEventsList";
import FlashRequestButton from "@/components/client/FlashRequestButton";
import { toggleRsvp } from "./actions";

function FeatureCard({
  icon: Icon,
  title,
  tagline,
  href,
}: {
  icon: React.ElementType;
  title: string;
  tagline: string;
  href: string;
}) {
  return (
    <Link
      href={href}
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
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#F5EDED" }}>{title}</p>
        <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "rgba(245,237,237,0.4)", lineHeight: 1.4 }}>
          {tagline}
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
  // Réservé aux clients payants (voir proxy.ts) — vérification explicite en
  // plus du middleware, les lives étant un canal direct vers le coach. Un
  // coach lui-même suivi par un autre coach (double rôle) n'est jamais
  // soumis à ce paywall entre professionnels (voir Lot 1).
  if (profile?.role !== "coach" && !isSubscribed(profile)) redirect("/dashboard/client/abonnement");

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

      <div className="mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          À toi de choisir
        </p>
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <FeatureCard
            icon={CalendarPlus}
            title="Réserver un 1:1"
            tagline="Choisis un créneau libre de ton coach"
            href="/dashboard/client/live/reserver"
          />
          <FeatureCard
            icon={Repeat}
            title="Suivi hebdomadaire"
            tagline="Un rendez-vous chaque semaine, 8 semaines d'un coup"
            href="/dashboard/client/live/reserver"
          />
          <FeatureCard
            icon={GraduationCap}
            title="Ateliers & lives de groupe"
            tagline="Formations en direct programmées par ton coach"
            href="#lives-a-venir"
          />
        </div>
        <FlashRequestButton />
      </div>

      <div id="lives-a-venir" style={{ scrollMarginTop: 80, marginTop: 24 }}>
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
