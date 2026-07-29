import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { getAllClientPhotoUpdates } from "@/utils/photos";
import { saveCompetitionSettings, sendPhotoFeedback } from "./actions";
import CoachClientPhotosView from "@/components/ui/CoachClientPhotosView";
import { ChevronLeft } from "lucide-react";

export default async function CoachClientPhotosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/");

  const [profile, client] = await Promise.all([
    getProfile(user.id),
    getClientById(id, user.id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();

  const photos = await getAllClientPhotoUpdates(id);

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto page-transition">
      <Link
        href={`/dashboard/coach/clients/${id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        {client.full_name}
      </Link>

      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Photos
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          {client.full_name}
        </h1>
      </div>

      <CoachClientPhotosView
        client={client}
        photos={photos}
        saveCompetitionSettings={saveCompetitionSettings}
        sendPhotoFeedback={sendPhotoFeedback}
      />
    </div>
  );
}
