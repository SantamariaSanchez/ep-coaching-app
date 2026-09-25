export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { loadStaffContext } from "@/lib/staff-page";
import { MODULES, navGroups } from "@/lib/staff-roles";
import { getUnreadBySender } from "@/lib/staff-team";
import StaffShell from "@/components/staff/StaffShell";
import ServiceWorkerRegister from "@/components/ui/ServiceWorkerRegister";

// Espace métier des recrues (demande directe 2026-09-25 : "pour chaque
// métier il faut que l'appli soit adaptée à son métier"). Hors de
// /dashboard volontairement : aucune des briques coach/client (navigation,
// compte gratuit, rappel du bilan) n'a de sens ici.
export default async function EquipeLayout({ children }: { children: React.ReactNode }) {
  const ctx = await loadStaffContext();
  if (ctx === "anonymous") redirect("/auth/equipe");
  if (ctx === "not-staff") redirect("/dashboard/client");
  if (ctx === "inactive") {
    // La page /equipe/inactif gère elle-même son affichage.
    return <div style={{ minHeight: "100vh", background: "#0D0000" }}>{children}</div>;
  }

  const unlocked = ctx.emailVerified && ctx.contractSigned;
  const unread = unlocked ? Object.values(await getUnreadBySender(ctx.member.owner_id, ctx.userId)).reduce((a, b) => a + b, 0) : 0;
  return (
    <StaffShell
      fullName={ctx.member.full_name}
      roleTitle={ctx.role.title}
      poleName={ctx.pole.name}
      poleColor={ctx.pole.color}
      groups={unlocked ? navGroups(ctx.cfg).map((g) => ({ label: g.label, items: g.items.map((k) => ({ key: k, label: MODULES[k].label })) })) : []}
      unreadMessages={unread}
      unlocked={unlocked}
    >
      <ServiceWorkerRegister />
      {children}
    </StaffShell>
  );
}
