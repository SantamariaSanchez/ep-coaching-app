import { getT } from "@/lib/i18n-server";
import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getAppSetup } from "@/lib/app-setup-server";
import { defaultAnswers } from "@/lib/app-setup-defaults";
import { getClientIntake } from "@/utils/client-intake";
import AppSetupWizard from "@/components/setup/AppSetupWizard";

export const dynamic = "force-dynamic";

// "Mon appli" côté coach : sa façon de travailler (évolutive), ses objectifs,
// ses plateformes, et ce qu'il suit pour lui-même dans son espace Moi.
export default async function CoachAppSetupPage() {
  const t = await getT();
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") redirect("/dashboard/client/mon-appli");
  const [setup, intake] = await Promise.all([getAppSetup(user.id), getClientIntake(user.id)]);
  const initial = defaultAnswers(setup, { role: "coach", isWoman: intake?.gender === "Femme" });
  return (
    <div className="page-transition" style={{ maxWidth: 560, margin: "0 auto", padding: "28px 16px 90px" }}>
      <h1 className="ep-h1" style={{ marginBottom: 6 }}>{t("Mon appli")}</h1>
      <p style={{ fontSize: 13.5, color: "rgba(245,237,237,0.55)", margin: "0 0 18px", lineHeight: 1.6 }}>
        {t("Ta façon de travailler, tes objectifs et tes plateformes : l'appli s'adapte et évolue avec toi. Tu peux changer à tout moment.")}
      </p>
      <AppSetupWizard role="coach" initialAnswers={initial} doneHref="/dashboard/coach" />
    </div>
  );
}
