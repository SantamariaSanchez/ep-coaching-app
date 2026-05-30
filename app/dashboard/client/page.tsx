import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { getThisWeekCheckin, getISOWeek } from "@/utils/checkins";
import { getLatestCoachNote } from "@/utils/notes";
import { getClientMeasurements } from "@/utils/measurements";
import ClientDashboardStats from "@/components/client/DashboardStats";
import {
  Dumbbell,
  Apple,
  Ruler,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Star,
} from "lucide-react";

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
      {children}
    </p>
  );
}

function QuickCard({
  href,
  icon: Icon,
  title,
  color,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 bg-[#1f0101] border border-[#890404]/20 hover:border-[#890404]/50 rounded-xl px-4 py-3.5 transition-colors group"
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: `${color}15`,
          border: `1px solid ${color}25`,
        }}
      >
        <Icon size={16} style={{ color }} strokeWidth={1.8} />
      </div>
      <span className="text-sm font-bold text-white flex-1">{title}</span>
      <ChevronRight
        size={14}
        className="text-[#F5EDED]/25 group-hover:text-[#F5EDED]/50 transition-colors"
      />
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ClientDashboard() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  // Only redirect if we KNOW the role is coach — never redirect on null profile
  // (would cause infinite loop if Supabase fetch fails)
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const [thisWeekCheckin, latestNote, measurements] = await Promise.all([
    getThisWeekCheckin(user.id),
    getLatestCoachNote(user.id),
    getClientMeasurements(user.id),
  ]);

  // ── Computed ───────────────────────────────────────────────────────────────
  const firstName = profile?.full_name?.split(" ")[0]?.toUpperCase() ?? "";
  const today = new Date();
  const formattedDate = (() => {
    const s = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(today);
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();
  const weekNumber = getISOWeek(today);

  // Weight
  const currentWeight =
    measurements[0]?.weight ?? thisWeekCheckin?.weight ?? null;
  const startWeight = profile?.weight_start ?? null;
  const weightDelta =
    currentWeight != null && startWeight != null
      ? parseFloat((currentWeight - startWeight).toFixed(1))
      : null;

  // phase is fetched client-side via ClientDashboardStats — default neutral here
  const phase: string | null = null;
  const weightDir: "up" | "down" | "neutral" =
    phase === "deficit" ? "down" : phase === "surplus" ? "up" : "neutral";

  const weightDeltaGood =
    weightDelta == null
      ? null
      : weightDir === "down"
      ? weightDelta < 0
      : weightDir === "up"
      ? weightDelta > 0
      : null;

  // Weeks since start
  const weeksSinceStart = profile?.start_date
    ? Math.floor(
        (today.getTime() -
          new Date(profile.start_date + "T12:00:00").getTime()) /
          (7 * 24 * 60 * 60 * 1000)
      )
    : null;

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="ep-section-title mb-1">{formattedDate}</p>
        <h1 className="text-3xl font-black uppercase" style={{ letterSpacing: "-0.02em" }}>
          Bonjour {firstName}
        </h1>
        {weeksSinceStart != null && (
          <p className="mt-1 text-xs text-ep-muted">
            Semaine {weekNumber} · {weeksSinceStart} sem. de coaching
          </p>
        )}
      </div>

      {/* ── Stats du jour & semaine — fetchées client-side pour render instantané */}
      <ClientDashboardStats />

      {/* ── Mon coach ───────────────────────────────────────────────────────── */}
      <section className="mb-6">
        <SectionLabel>Mon coach</SectionLabel>
        <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5">
          {latestNote ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
                  Bilan semaine{" "}
                  {latestNote.week_number ?? "—"}
                </p>
                {latestNote.rating != null && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Star
                      size={12}
                      fill="#fbbf24"
                      className="text-amber-400"
                    />
                    <span className="text-sm font-black text-amber-400">
                      {latestNote.rating}
                      <span className="text-[10px] font-normal text-[#F5EDED]/40">
                        /10
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {latestNote.observations && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1.5">
                    Observations
                  </p>
                  <p className="text-sm text-[#F5EDED]/75 leading-relaxed line-clamp-3">
                    {latestNote.observations}
                  </p>
                </div>
              )}

              {latestNote.next_actions && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1.5">
                    Actions prévues
                  </p>
                  <p className="text-sm text-[#F5EDED]/75 leading-relaxed line-clamp-3">
                    {latestNote.next_actions}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#890404]/15 flex items-center justify-center mb-1">
                <Star size={18} className="text-[#F5EDED]/25" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-[#F5EDED]/50">
                Ton coach prépare ton bilan
              </p>
              <p className="text-xs text-[#F5EDED]/25">
                Les retours apparaîtront ici chaque semaine
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Mes objectifs ───────────────────────────────────────────────────── */}
      <section className="mb-6">
        <SectionLabel>Mes objectifs</SectionLabel>
        <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 space-y-4">
          {/* Weight stats */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
                Poids de départ
              </p>
              <p className="text-2xl font-black text-white">
                {startWeight != null ? (
                  <>
                    {startWeight}
                    <span className="text-xs font-normal text-[#F5EDED]/40 ml-1">
                      kg
                    </span>
                  </>
                ) : (
                  <span className="text-[#F5EDED]/25">—</span>
                )}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
                Poids actuel
              </p>
              <p className="text-2xl font-black text-white">
                {currentWeight != null ? (
                  <>
                    {currentWeight}
                    <span className="text-xs font-normal text-[#F5EDED]/40 ml-1">
                      kg
                    </span>
                  </>
                ) : (
                  <span className="text-[#F5EDED]/25">—</span>
                )}
              </p>
            </div>
          </div>

          {/* Delta */}
          {weightDelta != null && (
            <div className="flex items-center gap-2">
              {weightDelta === 0 ? (
                <Minus size={14} className="text-[#F5EDED]/40" />
              ) : weightDelta < 0 ? (
                <TrendingDown
                  size={14}
                  className={
                    weightDeltaGood === true
                      ? "text-green-400"
                      : weightDeltaGood === false
                      ? "text-red-400"
                      : "text-[#F5EDED]/50"
                  }
                />
              ) : (
                <TrendingUp
                  size={14}
                  className={
                    weightDeltaGood === true
                      ? "text-green-400"
                      : weightDeltaGood === false
                      ? "text-red-400"
                      : "text-[#F5EDED]/50"
                  }
                />
              )}
              <span
                className={`text-sm font-bold ${
                  weightDeltaGood === true
                    ? "text-green-400"
                    : weightDeltaGood === false
                    ? "text-red-400"
                    : "text-[#F5EDED]/60"
                }`}
              >
                {weightDelta > 0 ? "+" : ""}
                {weightDelta} kg depuis le départ
              </span>
            </div>
          )}

          {/* Progress bar (weight change relative to start) */}
          {startWeight != null && currentWeight != null && startWeight !== 0 && (
            <div>
              <div className="h-1.5 bg-[#890404]/15 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(
                      (Math.abs(weightDelta ?? 0) / startWeight) * 1000,
                      100
                    )}%`,
                    backgroundColor:
                      weightDeltaGood === true
                        ? "#4ade80"
                        : weightDeltaGood === false
                        ? "#ef4444"
                        : "#60a5fa",
                  }}
                />
              </div>
            </div>
          )}

          {/* Infos */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#890404]/15">
            {profile?.start_date && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-0.5">
                  Date de début
                </p>
                <p className="text-xs text-white font-medium">
                  {new Intl.DateTimeFormat("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(new Date(profile.start_date + "T12:00:00"))}
                </p>
              </div>
            )}
            {weeksSinceStart != null && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-0.5">
                  Coaching
                </p>
                <p className="text-xs text-white font-medium">
                  {weeksSinceStart} semaine{weeksSinceStart !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>

          {/* Goal text */}
          {profile?.goal && (
            <div className="pt-1 border-t border-[#890404]/15">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1.5">
                Mon objectif
              </p>
              <p className="text-sm text-[#F5EDED]/70 leading-relaxed">
                {profile.goal}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Accès rapide ────────────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Accès rapide</SectionLabel>
        <div className="grid grid-cols-1 gap-2">
          <QuickCard
            href="/dashboard/client/program"
            icon={Dumbbell}
            title="Mon Programme"
            color="#E01E1E"
          />
          <QuickCard
            href="/dashboard/client/nutrition"
            icon={Apple}
            title="Ma Nutrition"
            color="#4ade80"
          />
          <QuickCard
            href="/dashboard/client/measurements"
            icon={Ruler}
            title="Mes Mensurations"
            color="#60a5fa"
          />
          <QuickCard
            href="/dashboard/client/checkin"
            icon={ClipboardList}
            title="Mon Check-in"
            color="#fbbf24"
          />
        </div>
      </section>
    </div>
  );
}
