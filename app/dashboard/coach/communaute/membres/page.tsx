import { redirect } from "next/navigation";
import { getUser, getProfile, getCommunityMembersWithActivity } from "@/utils/auth";
import { Heart } from "lucide-react";
import MembresView from "@/components/community/MembresView";
import { relaunchMember } from "./actions";

export default async function CoachMembresPage() {
  const user = await getUser();
  if (!user) redirect("/");

  // members ne dépend que de user.id (déjà connu), pas du contenu de
  // profile : lancé en parallèle plutôt qu'après la vérification de rôle.
  const [profile, members] = await Promise.all([
    getProfile(user.id),
    getCommunityMembersWithActivity(user.id),
  ]);
  if (profile?.role === "client") redirect("/dashboard/client/communaute/victoires");

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Communauté
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <Heart size={26} className="text-[#E01E1E]" strokeWidth={1.8} />
          Membres
        </h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Membres gratuits de la communauté, autonomes, sans suivi coaching. Ils n&apos;apparaissent pas dans tes
          clients.
        </p>
      </div>

      <MembresView members={members} relaunchMember={relaunchMember} />
    </div>
  );
}
