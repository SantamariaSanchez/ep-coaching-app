export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { loadStaffContext } from "@/lib/staff-page";
import { MODULES } from "@/lib/staff-roles";
import StaffShell from "@/components/staff/StaffShell";

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
  return (
    <StaffShell
      fullName={ctx.member.full_name}
      roleTitle={ctx.role.title}
      poleName={ctx.pole.name}
      poleColor={ctx.pole.color}
      modules={unlocked ? ctx.cfg.modules.map((k) => ({ key: k, label: MODULES[k].label })) : []}
      unlocked={unlocked}
    >
      {children}
    </StaffShell>
  );
}
