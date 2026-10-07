import { getT } from "@/lib/i18n-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, Users2, CalendarClock, ArrowUp, ArrowDown, Minus, Zap } from "lucide-react";
import { getUser, getProfile, getClients } from "@/utils/auth";
import { getAllLiveEventsForCoach } from "@/utils/live-events";
import { LIVE_TYPE_LABELS, isWithinJoinWindow, type LiveEvent } from "@/lib/live-types";
import { todayInParis } from "@/lib/dates";
import {
  addDaysToDateStr, formatCountdown, formatRelativeLiveDate, mondayOfDateStr, parisWallClockToIso,
} from "@/lib/live-time";
import LiveEventsList from "@/components/live/LiveEventsList";
import FlashRequestsPanel from "@/components/coach/FlashRequestsPanel";
import {
  createLiveEvent, cancelLiveEvent, deleteLiveEvent, updateLiveEvent, updateLiveRecap,
  getPendingFlashRequests, getFlashResponseStats,
} from "./actions";

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest === 0 ? `${h}h` : `${h}h${String(rest).padStart(2, "0")}`;
}

// Début (instant réel) du lundi 00:00 heure de Paris, décalé de N semaines.
// Calculé en dates calendaires puis converti : une semaine qui contient le
// passage à l'heure d'hiver dure 7 j + 1 h, pas 7 x 24 h.
function parisWeekStartMs(weeksOffset: number): number {
  const monday = addDaysToDateStr(mondayOfDateStr(todayInParis()), 7 * weeksOffset);
  return new Date(parisWallClockToIso(monday, "00:00") ?? `${monday}T00:00:00Z`).getTime();
}

// Chiffres du bandeau, sortis du composant : ils dépendent de l'heure
// courante, que React ne veut pas voir lue pendant le rendu.
function computeLiveOverview(events: LiveEvent[]) {
  const now = Date.now();
  const byStart = (a: LiveEvent, b: LiveEvent) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();

  // "Prochain live" inclut un live en cours (commencé mais pas fini) : avant,
  // il disparaissait du bandeau dès sa première minute, au moment précis où
  // le coach avait besoin d'y accéder.
  const next = events
    .filter((e) => {
      if (e.status !== "scheduled") return false;
      const start = new Date(e.starts_at).getTime();
      return start + e.duration_minutes * 60 * 1000 > now;
    })
    .sort(byStart)[0] ?? null;
  const nextStart = next ? new Date(next.starts_at).getTime() : null;
  const nextInProgress = nextStart !== null && nextStart <= now;
  const nextJoinable = next ? isWithinJoinWindow(next) : false;
  const nextLabel = next
    ? nextInProgress
      ? `En cours depuis ${formatCountdown(now - (nextStart as number))}`
      : formatRelativeLiveDate(next.starts_at)
    : null;

  const weekEnd = now + 7 * 24 * 60 * 60 * 1000;
  const thisWeekCount = events.filter((e) => {
    const t = new Date(e.starts_at).getTime();
    return e.status === "scheduled" && t > now && t <= weekEnd;
  }).length;

  // Nouveau (même logique que Finance/Leads : un chiffre isolé sans repère
  // ne dit rien de la direction) : lives tenus cette semaine calendaire
  // (lundi-dimanche, passés + encore à venir) vs la semaine dernière —
  // distinct de "Cette semaine" ci-dessus qui regarde 7 jours glissants à
  // venir, pas la semaine calendaire déjà entamée. Bornes en heure de Paris :
  // avant, le lundi était celui du serveur (UTC), décalé de 1 à 2 h.
  const thisCalWeekStart = parisWeekStartMs(0);
  const nextCalWeekStart = parisWeekStartMs(1);
  const lastCalWeekStart = parisWeekStartMs(-1);
  const nonCancelled = events.filter((e) => e.status !== "cancelled");
  const heldThisCalWeek = nonCancelled.filter((e) => {
    const t = new Date(e.starts_at).getTime();
    return t >= thisCalWeekStart && t < nextCalWeekStart;
  }).length;
  const heldLastCalWeek = nonCancelled.filter((e) => {
    const t = new Date(e.starts_at).getTime();
    return t >= lastCalWeekStart && t < thisCalWeekStart;
  }).length;

  return { next, nextLabel, nextJoinable, thisWeekCount, heldThisCalWeek, heldLastCalWeek };
}

export default async function CoachLivePage({
  searchParams,
}: {
  searchParams: Promise<{ recap?: string | string[] }>;
}) {
  const tr = await getT();
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client/live");

  // ?recap=<id> : retour de "Terminer le live" (LiveRoomLobby), la carte de
  // ce live ouvre directement la saisie des notes.
  const { recap } = await searchParams;
  const autoOpenRecapId = typeof recap === "string" ? recap : null;

  const [events, clients, flashRequests, flashResponseStats] = await Promise.all([
    getAllLiveEventsForCoach(user.id),
    getClients(user.id),
    getPendingFlashRequests(),
    getFlashResponseStats(),
  ]);

  const { next, nextLabel, nextJoinable, thisWeekCount, heldThisCalWeek, heldLastCalWeek } =
    computeLiveOverview(events);
  const liveDelta = heldThisCalWeek - heldLastCalWeek;
  const LiveTrendIcon = liveDelta > 0 ? ArrowUp : liveDelta < 0 ? ArrowDown : Minus;
  const liveTrendColor = liveDelta > 0 ? "#4ade80" : liveDelta < 0 ? "#fb923c" : "rgba(245,237,237,0.35)";

  return (
    <div className="px-6 py-8 ep-page-wide pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          {tr("Live")}
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">{tr("Coaching live")}</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          {tr("1:1, audits, suivi hebdo, accès direct, ateliers... tout ton accompagnement en direct, réuni ici.")}
        </p>
        <Link
          href="/dashboard/coach/live/disponibilites"
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#E01E1E] mt-2"
        >
          <CalendarClock size={13} />
          {tr("Gérer mes disponibilités 1:1 (réservation libre-service)")}
        </Link>
      </div>

      <div className="ep-card" style={{ padding: "16px 20px", display: "flex", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          <p className="ep-label" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
            <Calendar size={11} />{" "}{tr("Prochain live")}
          </p>
          {next ? (
            <>
              <p style={{ fontSize: 15, fontWeight: 900, color: "#F5EDED", margin: 0, overflowWrap: "anywhere" }}>{next.title}</p>
              <p style={{ fontSize: 12, color: "rgba(245,237,237,0.45)", margin: "2px 0 0" }}>
                {nextLabel} · {LIVE_TYPE_LABELS[next.type]}
              </p>
              {nextJoinable && (
                <Link
                  href={`/dashboard/coach/live/${next.id}`}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white bg-[#E01E1E] hover:bg-[#B00202] rounded-lg px-3 py-1.5 mt-2 transition-colors"
                >
                  {tr("Ouvrir la salle")}
                </Link>
              )}
            </>
          ) : (
            <p style={{ fontSize: 13, color: "rgba(245,237,237,0.35)", margin: 0 }}>{tr("Rien de programmé. Planifie ton prochain live ci-dessous.")}</p>
          )}
        </div>
        <div>
          <p className="ep-label" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
            <Users2 size={11} />{" "}{tr("Cette semaine")}
          </p>
          <p style={{ fontSize: 20, fontWeight: 900, color: "#F5EDED", margin: 0 }}>{thisWeekCount}</p>
        </div>
        <div>
          <p className="ep-label" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
            <Calendar size={11} />{" "}{tr("Tenus cette semaine")}
          </p>
          <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 20, fontWeight: 900, color: "#F5EDED", margin: 0 }}>
            {heldThisCalWeek}
            <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 800, color: liveTrendColor }}>
              <LiveTrendIcon size={11} strokeWidth={2.5} />
              {liveDelta !== 0 && `${liveDelta > 0 ? "+" : ""}${liveDelta}`}
            </span>
          </p>
        </div>
        {flashRequests.length > 0 && (
          <div>
            <p className="ep-label" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
              {tr("Points flash")}
            </p>
            <p style={{ fontSize: 20, fontWeight: 900, color: "#E01E1E", margin: 0 }}>{flashRequests.length}</p>
          </div>
        )}
        {/* Nouveau : resolved_at existait déjà sur chaque demande de point
            flash (posé à l'acceptation ou au refus) mais jamais exploité —
            le point flash promet une "réponse rapide", sans jamais vérifier
            si c'est tenu. */}
        {flashResponseStats.avgMinutes != null && (
          <div>
            <p className="ep-label" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
              <Zap size={11} />{" "}{tr("Réponse moyenne (30j)")}
            </p>
            <p style={{ fontSize: 20, fontWeight: 900, color: "#F5EDED", margin: 0 }}>
              {formatMinutes(flashResponseStats.avgMinutes)}
            </p>
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
        autoOpenRecapId={autoOpenRecapId}
      />
    </div>
  );
}
