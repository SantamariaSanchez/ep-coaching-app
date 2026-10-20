import { getT } from "@/lib/i18n-server";
import BackButton from "@/components/ui/BackButton";
import { redirect } from "next/navigation";
import { getUser } from "@/utils/auth";
import { isTeamOwner } from "@/lib/team-owner";
import { getChannel, getTeamDirectory, getThread, getUnreadBySender } from "@/lib/staff-team";
import TeamChat from "@/components/staff/TeamChat";

export const dynamic = "force-dynamic";

// Messagerie d'équipe côté fondateur : tous les membres, quel que soit leur
// métier, et le canal général.
export default async function FounderTeamMessagesPage({ searchParams }: { searchParams: Promise<{ avec?: string }> }) {
  const t = await getT();
  const { avec } = await searchParams;
  const user = await getUser();
  if (!user) redirect("/");
  // Fondateur ou coach en mode entreprise : chacun ne voit que SON équipe.
  if (!(await isTeamOwner(user.id))) redirect("/dashboard/coach/mon-equipe");

  const people = await getTeamDirectory(user.id);
  const active = avec === "general" || people.some((p) => p.id === avec && p.id !== user.id) ? (avec as string) : "general";
  const messages = active === "general" ? await getChannel(user.id) : await getThread(user.id, user.id, active);

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto pb-24 md:pb-8 page-transition">
      <BackButton fallbackHref="/dashboard/coach/admin/equipe" expect="/dashboard/coach/admin/equipe" label={t("Pilotage de l'équipe")} className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-(--ep-ink)/40 hover:text-(--ep-ink)/70 transition-colors mb-6" />
      <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 mb-1">{t("Administration")}</p>
      <h1 className="text-3xl font-black uppercase tracking-tight mb-6">{t("Messagerie de l'équipe")}</h1>
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
