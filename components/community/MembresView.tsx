"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Mail, MessageCircle, Bell, CheckCircle2, Flame, MoonStar } from "lucide-react";
import type { CommunityMemberWithActivity } from "@/utils/auth";
import RankBadge from "@/components/ui/RankBadge";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days < 1) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} j`;
  const months = Math.floor(days / 30);
  return `il y a ${months} mois`;
}

function initials(name: string | null): string {
  return (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type Filter = "all" | "active" | "dormant";
type Sort = "recent" | "active";

function MemberRow({
  member,
  onRelaunch,
}: {
  member: CommunityMemberWithActivity;
  onRelaunch: (id: string) => Promise<void>;
}) {
  const [relaunching, setRelaunching] = useState(false);
  const [relaunched, setRelaunched] = useState(false);
  const { activity } = member;
  const isActive = activity.points > 0 || activity.sessionCount > 0 || activity.postCount > 0;

  return (
    <div className="flex items-center gap-3 bg-[#1f0101] border border-[#890404]/20 rounded-xl px-4 py-3.5">
      <Link href={`/dashboard/coach/profile/${member.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        {member.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E01E1E] to-[#890404] flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">
            {initials(member.full_name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold text-white truncate">{member.full_name}</p>
            <RankBadge points={activity.points} />
            {activity.neverReturned ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#150000] border border-[#890404]/25 text-[#F5EDED]/35">
                <MoonStar size={9} /> Jamais revenu
              </span>
            ) : isActive ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/25 text-green-300">
                <Flame size={9} /> Actif
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#F5EDED]/35 mt-0.5">
            <Mail size={10} />
            <span className="truncate">{member.email}</span>
          </div>
          <p className="text-[10px] text-[#F5EDED]/30 mt-0.5">
            {activity.sessionCount > 0
              ? `${activity.sessionCount} séance${activity.sessionCount > 1 ? "s" : ""} · dernière ${timeAgo(activity.lastSessionAt!)}`
              : "Aucune séance loguée"}
            {activity.postCount > 0 && ` · ${activity.postCount} post${activity.postCount > 1 ? "s" : ""} communauté`}
          </p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {member.goal && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#890404]/15 text-[#F5EDED]/50 border border-[#890404]/20">
                {member.goal}
              </span>
            )}
            {member.level && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#890404]/15 text-[#F5EDED]/50 border border-[#890404]/20">
                {member.level}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <Link
          href={`/dashboard/coach/messages/${member.id}`}
          className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/70 transition-colors"
        >
          <MessageCircle size={12} /> Message
        </Link>
        {activity.neverReturned && (
          <button
            onClick={async () => {
              setRelaunching(true);
              await onRelaunch(member.id);
              setRelaunching(false);
              setRelaunched(true);
            }}
            disabled={relaunching || relaunched}
            className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-amber-400 hover:text-amber-300 disabled:opacity-50 transition-colors"
          >
            {relaunched ? (
              <>
                <CheckCircle2 size={12} /> Relancé
              </>
            ) : (
              <>
                <Bell size={12} /> {relaunching ? "…" : "Relancer"}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function MembresView({
  members,
  relaunchMember,
}: {
  members: CommunityMemberWithActivity[];
  relaunchMember: (id: string) => Promise<{ error?: string }>;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");

  const counts = useMemo(() => {
    let active = 0;
    let dormant = 0;
    for (const m of members) {
      if (m.activity.neverReturned) dormant++;
      else if (m.activity.points > 0 || m.activity.sessionCount > 0 || m.activity.postCount > 0) active++;
    }
    return { all: members.length, active, dormant };
  }, [members]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = members.filter((m) => {
      if (filter === "active") return !m.activity.neverReturned && (m.activity.points > 0 || m.activity.sessionCount > 0 || m.activity.postCount > 0);
      if (filter === "dormant") return m.activity.neverReturned;
      return true;
    });
    if (q) {
      list = list.filter(
        (m) => (m.full_name ?? "").toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q)
      );
    }
    if (sort === "active") {
      list = [...list].sort(
        (a, b) => b.activity.points + b.activity.sessionCount * 5 - (a.activity.points + a.activity.sessionCount * 5)
      );
    }
    return list;
  }, [members, search, filter, sort]);

  async function handleRelaunch(id: string) {
    await relaunchMember(id);
  }

  if (members.length === 0) {
    return (
      <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-12 px-6 text-center">
        <p className="text-sm text-[#F5EDED]/45 font-semibold mb-1.5">Aucun membre pour l&apos;instant</p>
        {/* Item 40 : la précédente version s'arrêtait à "Aucun membre pour
            l'instant", sans dire d'où ils viennent ni ce que ça implique. */}
        <p className="text-xs text-[#F5EDED]/25 max-w-sm mx-auto leading-relaxed">
          Les membres s&apos;inscrivent eux-mêmes depuis l&apos;appli (accès gratuit aux outils, sans coaching).
          Ils apparaîtront ici dès leur inscription.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[10px] text-[#F5EDED]/30">
        {counts.all} membre{counts.all > 1 ? "s" : ""} gratuit{counts.all > 1 ? "s" : ""}
        {counts.active > 0 && ` · ${counts.active} actif${counts.active > 1 ? "s" : ""}`}
        {counts.dormant > 0 && ` · ${counts.dormant} jamais revenu${counts.dormant > 1 ? "s" : ""}`}
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/25" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un membre…"
            className={`${inputCls} pl-9`}
          />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={`${inputCls} sm:w-48`}>
          <option value="recent">Plus récents</option>
          <option value="active">Plus actifs</option>
        </select>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {([
          ["all", `Tous (${counts.all})`],
          ["active", `Actifs (${counts.active})`],
          ["dormant", `Jamais revenus (${counts.dormant})`],
        ] as [Filter, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${
              filter === key ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]" : "border-[#890404]/25 text-[#F5EDED]/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((m) => (
          <MemberRow key={m.id} member={m} onRelaunch={handleRelaunch} />
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-[#F5EDED]/25 italic text-center py-10">Aucun membre ne correspond à ta recherche.</p>
        )}
      </div>
    </div>
  );
}
