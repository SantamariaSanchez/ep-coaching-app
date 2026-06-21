import { redirect, notFound } from "next/navigation";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { getClientTasks } from "@/utils/tasks";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import CoachClientTasksView from "@/components/ui/CoachClientTasksView";
import { createClientTask, deleteClientTask, sendMotivationMessage } from "./actions";

export default async function CoachClientTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/");

  const [profile, client, tasks] = await Promise.all([
    getProfile(user.id),
    getClientById(id),
    getClientTasks(id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <Link
        href={`/dashboard/coach/clients/${id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        {client.full_name ?? "Client"}
      </Link>

      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Rappels & motivation
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          {client.full_name ?? "Client"}
        </h1>
      </div>

      <CoachClientTasksView
        clientId={id}
        initialTasks={tasks}
        createClientTask={createClientTask}
        deleteClientTask={deleteClientTask}
        sendMotivationMessage={sendMotivationMessage}
      />
    </div>
  );
}
