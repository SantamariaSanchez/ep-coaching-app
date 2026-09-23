import { redirect } from "next/navigation";
import Link from "next/link";
import { Trophy, Rocket } from "lucide-react";
import { getUser, getProfile } from "@/utils/auth";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard";
import RankBadge from "@/components/ui/RankBadge";
import BackButton from "@/components/ui/BackButton";

function initials(name: string | null): string {
  return (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function LeaderboardRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
        isMe ? "bg-[#E01E1E]/10 border-[#E01E1E]/40" : "bg-[#1f0101] border-[#890404]/20"
      }`}
    >
      <span className="w-7 text-center text-sm font-black text-[#F5EDED]/45 flex-shrink-0">
        {MEDALS[entry.position] ?? entry.position}
      </span>
      {entry.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={entry.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E01E1E] to-[#890404] flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">
          {initials(entry.full_name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">
          {entry.full_name ?? "Membre"}
          {isMe && <span className="text-[#F5EDED]/35 font-medium"> (toi)</span>}
        </p>
        <RankBadge points={entry.points} />
      </div>
      <span className="text-xs font-black text-[#F5EDED]/70 flex-shrink-0">{entry.points} pts</span>
    </div>
  );
}

export default async function ClassementPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/");
  if (profile.role === "coach") redirect("/dashboard/coach/communaute/membres");

  const { top, me } = await getLeaderboard(user.id);
  const meInTop = me ? top.some((e) => e.id === me.id) : false;

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <BackButton fallbackHref="/dashboard/client/communaute/victoires" />

      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Communauté
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <Trophy size={26} className="text-[#E01E1E]" strokeWidth={1.8} />
          Classement
        </h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Séances, repas notés, bilans, partages : chaque action réelle rapporte des points. Membres gratuits
          et clients accompagnés, tous coachs confondus, sur un seul classement.
        </p>
      </div>

      {me && !meInTop && (
        <div className="mb-4">
          <LeaderboardRow entry={me} isMe />
        </div>
      )}

      {!me && (
        <div className="mb-6 bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 flex items-start gap-3">
          <Rocket size={18} className="text-[#E01E1E] flex-shrink-0 mt-0.5" strokeWidth={1.8} />
          <div>
            <p className="text-sm font-bold text-white">Tu n&apos;es pas encore classé</p>
            <p className="text-xs text-[#F5EDED]/45 mt-1 leading-relaxed">
              Logue une séance, note un repas ou fais ton bilan du jour : le premier point t&apos;inscrit au
              classement.
            </p>
            <Link
              href="/dashboard/client"
              className="inline-block mt-3 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#F5EDED] transition-colors"
            >
              Voir mes actions à faire →
            </Link>
          </div>
        </div>
      )}

      {top.length === 0 ? (
        <p className="text-sm text-[#F5EDED]/35 text-center py-10">
          Personne n&apos;a encore de points. Sois le ou la première.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {top.map((entry) => (
            <LeaderboardRow key={entry.id} entry={entry} isMe={entry.id === user.id} />
          ))}
        </div>
      )}
    </div>
  );
}
