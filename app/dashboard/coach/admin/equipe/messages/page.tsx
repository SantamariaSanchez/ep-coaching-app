import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getUser, getProfile } from "@/utils/auth";
import { getChannel, getTeamDirectory, getThread, getUnreadBySender } from "@/lib/staff-team";
import TeamChat from "@/components/staff/TeamChat";

export const dynamic = "force-dynamic";

// Messagerie d'équipe côté fondateur : tous les membres, quel que soit leur
// métier, et le canal général.
export default async function FounderTeamMessagesPage({ searchParams }: { searchParams: Promise<{ avec?: string }> }) {
  const { avec } = await searchParams;
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) redirect("/dashboard/coach");

  const people = await getTeamDirectory(user.id);
  const active = avec === "general" || people.some((p) => p.id === avec && p.id !== user.id) ? (avec as string) : "general";
  const messages = active === "general" ? await getChannel(user.id) : await getThread(user.id, user.id, active);

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto pb-24 md:pb-8 page-transition">
      <Link href="/dashboard/coach/admin/equipe" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6">
        <ChevronLeft size={13} /> Pilotage de l&apos;équipe
      </Link>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">Administration</p>
      <h1 className="text-3xl font-black uppercase tracking-tight mb-6">Messagerie de l&apos;équipe</h1>
      <TeamChat
        meId={user.id}
        people={people}
        unread={await getUnreadBySender(user.id, user.id)}
        active={active}
        messages={messages}
        basePath="/dashboard/coach/admin/equipe/messages?avec="
      />
    </div>
  );
}
