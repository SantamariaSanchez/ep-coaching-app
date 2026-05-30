import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import NoteTemplates from "@/components/ui/NoteTemplates";
import { ChevronLeft } from "lucide-react";

export default async function NoteTemplatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/");

  const [profile, client] = await Promise.all([
    getProfile(user.id),
    getClientById(id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/dashboard/coach/clients/${id}/notes`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors"
        >
          <ChevronLeft size={14} />
          Notes
        </Link>
      </div>

      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Templates messages
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          {client.full_name}
        </h1>
        <p className="mt-1 text-xs text-[#F5EDED]/30">
          Cliquez sur un template pour le développer et copier le message
        </p>
      </div>

      <NoteTemplates clientName={client.full_name ?? "Client"} />
    </div>
  );
}
