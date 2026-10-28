import { getT } from "@/lib/i18n-server";
import BackButton from "@/components/ui/BackButton";
import { redirect, notFound } from "next/navigation";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { getTrainingGyms } from "@/utils/training-gyms";
import TrainingGymsManager from "@/components/gyms/TrainingGymsManager";

export const dynamic = "force-dynamic";

// Salles d'entraînement d'un client : matériel, photos de machines, et
// rattachement des séances du programme (choix de la salle dans l'éditeur).
export default async function ClientGymsPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect("/");
  const [profile, client] = await Promise.all([getProfile(user.id), getClientById(id, user.id)]);
  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();
  const gyms = await getTrainingGyms(id);

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto pb-24 page-transition">
      <div className="mb-4 flex items-center gap-3">
        <BackButton fallbackHref={`/dashboard/coach/clients/${id}/program`} label="" iconSize={18} className="p-1.5 -ml-1.5 rounded-lg text-(--ep-ink)/45 hover:text-(--ep-strong) hover:bg-(--ep-line)/25" />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35">{t("Salles")}</p>
          <h1 className="truncate text-xl font-black uppercase tracking-tight">{client.full_name ?? t("Client")}</h1>
        </div>
      </div>
      <TrainingGymsManager ownerId={id} gyms={gyms} />
    </div>
  );
}
