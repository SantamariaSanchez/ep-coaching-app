import { redirect } from "next/navigation";
import { getUser, getProfile, getCommunityMembers } from "@/utils/auth";
import CommunitySubNav from "@/components/community/CommunitySubNav";
import { Heart, Mail } from "lucide-react";

export default async function CoachMembresPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client/communaute/victoires");

  const members = await getCommunityMembers();

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <CommunitySubNav base="/dashboard/coach/communaute" isCoach />

      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Communauté
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Membres</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Membres gratuits de la communauté — autonomes, sans suivi coaching.
          Ils n&apos;apparaissent pas dans tes clients.
        </p>
      </div>

      {members.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-12 text-center">
          <Heart size={26} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">Aucun membre pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 bg-[#1f0101] border border-[#890404]/20 rounded-xl px-4 py-3.5"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E01E1E] to-[#890404] flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">
                {(m.full_name ?? "?")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{m.full_name}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-[#F5EDED]/35">
                  <Mail size={10} />
                  <span className="truncate">{m.email}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 justify-end max-w-[40%]">
                {m.goal && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#890404]/15 text-[#F5EDED]/50 border border-[#890404]/20">
                    {m.goal}
                  </span>
                )}
                {m.level && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#890404]/15 text-[#F5EDED]/50 border border-[#890404]/20">
                    {m.level}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
