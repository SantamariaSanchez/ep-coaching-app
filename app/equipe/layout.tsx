export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { loadStaffContext } from "@/lib/staff-page";
import { MODULES, navGroups } from "@/lib/staff-roles";
import { getUnreadBySender } from "@/lib/staff-team";
import StaffShell from "@/components/staff/StaffShell";
import NativeBridge from "@/components/native/NativeBridge";
import WelcomeTour from "@/components/help/WelcomeTour";
import ServiceWorkerRegister from "@/components/ui/ServiceWorkerRegister";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { getLocale } from "@/lib/i18n-server";
import { LocaleSync } from "@/components/i18n/LocaleSync";

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
  const locale = await getLocale(ctx.userId);
  return (
    <I18nProvider locale={locale}>
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
      <LocaleSync locale={locale} />
      <NativeBridge />
      {unlocked && <WelcomeTour />}
      {children}
    </StaffShell>
    </I18nProvider>
  );
}
