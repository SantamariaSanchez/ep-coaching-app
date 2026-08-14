import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getCoachMailingHistory } from "@/lib/coach-mailings";
import CoachMailingComposer from "@/components/coach/CoachMailingComposer";

// Axe 2 (VISION.md) : mailing par coach. Décision retenue avec
// l'utilisateur (2026-08-14) : segmentation par tag/liste Brevo sous le
// compte unique existant, pas de sous-comptes séparés par coach.
export default async function CoachMailingPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const history = await getCoachMailingHistory(user.id);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon activité
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Mailing</h1>
        <p className="mt-2 text-sm text-[#F5EDED]/45">
          Envoie un message à tous tes clients actifs d&apos;un coup. Teste-le d&apos;abord sur
          toi-même pour vérifier le rendu.
        </p>
      </div>

      <CoachMailingComposer initialHistory={history} />
    </div>
  );
}
