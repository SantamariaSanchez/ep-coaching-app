import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import ClientProfileTabs from "@/components/ui/ClientProfileTabs";
import { ChevronLeft } from "lucide-react";

const STATUS_BADGE = {
  active: {
    label: "Actif",
    className: "bg-green-500/15 text-green-400 border border-green-500/25",
  },
  paused: {
    label: "Pause",
    className: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  },
  ended: {
    label: "Terminé",
    className: "bg-[#F5EDED]/10 text-[#F5EDED]/40 border border-[#F5EDED]/10",
  },
};

export default async function ClientDetailPage({
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

  const badge = STATUS_BADGE[client.status ?? "active"];

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto page-transition">
      <Link
        href="/dashboard/coach/clients"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        Tous les clients
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">
            {client.full_name ?? "Client"}
          </h1>
        </div>
        <span
          className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <ClientProfileTabs client={client} />
    </div>
  );
}
