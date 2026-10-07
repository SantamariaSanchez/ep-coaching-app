import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getAppSetup } from "@/lib/app-setup-server";
import { defaultAnswers } from "@/lib/app-setup-defaults";
import { getClientIntake } from "@/utils/client-intake";
import AppSetupWizard from "@/components/setup/AppSetupWizard";

export const dynamic = "force-dynamic";

// "Mon appli" côté membre / client : ce qu'il veut suivre, rien de plus.
export default async function ClientAppSetupPage() {
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach/mon-appli");
  const [setup, intake, coachSetup] = await Promise.all([
    getAppSetup(user.id),
    getClientIntake(user.id),
    profile?.coach_id ? getAppSetup(profile.coach_id) : Promise.resolve(null),
  ]);
  const coachNiches = Array.isArray(coachSetup?.answers?.niches) ? (coachSetup.answers.niches as string[]) : [];
  const initial = defaultAnswers(setup, { role: "client", isWoman: intake?.gender === "Femme", coachNiches });
  return (
    <div className="page-transition" style={{ maxWidth: 560, margin: "0 auto", padding: "28px 16px 90px" }}>
      <h1 className="ep-h1" style={{ marginBottom: 6 }}>Mon appli</h1>
      <p style={{ fontSize: 13.5, color: "rgba(245,237,237,0.55)", margin: "0 0 18px", lineHeight: 1.6 }}>
        Dis-nous ce que tu veux suivre : ton menu et ton bilan ne garderont que ça. Tu peux changer à tout moment.
      </p>
      <AppSetupWizard role="client" initialAnswers={initial} doneHref="/dashboard/client" />
    </div>
  );
}
