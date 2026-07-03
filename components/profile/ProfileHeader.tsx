import { Crown, ShieldCheck, Heart, Calendar } from "lucide-react";
import type { Profile } from "@/utils/auth";
import { roleBadge, isSubscribed } from "@/utils/auth";
import PointsProgressCard from "@/components/ui/PointsProgressCard";

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
  avatarSrc,
  children,
}: {
  profile: Profile;
  postCount: number;
  points?: number;
  avatarSrc?: string | null;
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
        {avatarSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarSrc}
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
        </div>
      </div>
      {points != null && (
        <div className="mt-4">
          <PointsProgressCard points={points} isSubscribed={isSubscribed(profile)} />
        </div>
      )}
      {children}
    </div>
  );
}
