import { Crown, ShieldCheck, Heart, Calendar } from "lucide-react";
import type { Profile } from "@/utils/auth";
import { roleBadge } from "@/utils/auth";
import { getRankForPoints } from "@/lib/gamification";

function RankBadge({ points }: { points: number }) {
  const { rank, next, progressPct } = getRankForPoints(points);
  return (
    <div className="mt-3 bg-[#150000] border border-[#890404]/20 rounded-xl px-3.5 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-black text-white">
          <span className="text-base">{rank.emoji}</span>
          {rank.label}
        </span>
        <span className="text-[10px] font-bold text-[#F5EDED]/35">{points} pts</span>
      </div>
      {next ? (
        <>
          <div className="h-1.5 bg-[#1f0101] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#E01E1E] to-[#B00202] rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[9px] text-[#F5EDED]/25 mt-1">
            {next.minPoints - points} pts avant {next.label} {next.emoji}
          </p>
        </>
      ) : (
        <p className="text-[9px] text-[#F5EDED]/25">Rang maximum atteint</p>
      )}
    </div>
  );
}

function BadgePill({ badge }: { badge: ReturnType<typeof roleBadge> }) {
  const styles =
    badge === "Coach"
      ? { bg: "rgba(224,30,30,0.14)", border: "rgba(224,30,30,0.35)", color: "#E01E1E", Icon: ShieldCheck }
      : badge === "Premium"
      ? { bg: "rgba(250,204,21,0.1)", border: "rgba(250,204,21,0.3)", color: "#FACC15", Icon: Crown }
      : { bg: "rgba(245,237,237,0.06)", border: "rgba(245,237,237,0.15)", color: "rgba(245,237,237,0.55)", Icon: Heart };
  const { bg, border, color, Icon } = styles;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
      style={{ background: bg, border: `1px solid ${border}`, color }}
    >
      <Icon size={11} strokeWidth={2} />
      {badge}
    </span>
  );
}

export default function ProfileHeader({
  profile,
  postCount,
  points,
  children,
}: {
  profile: Profile;
  postCount: number;
  points?: number;
  children?: React.ReactNode;
}) {
  const badge = roleBadge(profile);
  const initials = (profile.full_name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const joined = profile.start_date
    ? new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
        new Date(profile.start_date + "T12:00:00")
      )
    : null;

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-2xl p-6 mb-6">
      <div className="flex items-start gap-4 flex-wrap">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="w-20 h-20 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E01E1E] to-[#890404] flex items-center justify-center text-2xl font-black text-white flex-shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black text-white truncate">{profile.full_name ?? "Membre"}</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <BadgePill badge={badge} />
            {joined && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#F5EDED]/35">
                <Calendar size={11} strokeWidth={1.8} /> Membre depuis {joined}
              </span>
            )}
          </div>
          {profile.bio && (
            <p className="text-sm text-[#F5EDED]/65 mt-3 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
          )}
          <p className="text-[11px] text-[#F5EDED]/30 mt-3">
            {postCount} publication{postCount !== 1 ? "s" : ""} dans la communauté
          </p>
          {points != null && <RankBadge points={points} />}
        </div>
      </div>
      {children}
    </div>
  );
}
