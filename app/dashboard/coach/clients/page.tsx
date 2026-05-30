import { redirect } from "next/navigation";
import { getUser, getProfile, getClients } from "@/utils/auth";
import ClientsSection from "@/components/ui/ClientsSection";

export default async function ClientsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/");
  }

  const [profile, clients] = await Promise.all([
    getProfile(user.id),
    getClients(),
  ]);

  if (profile?.role === "client") {
    redirect("/dashboard/client");
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto page-transition">
      <div className="mb-8">
        <p className="ep-section-title">Gestion</p>
        <h1 className="text-3xl font-black uppercase" style={{ letterSpacing: "-0.02em" }}>
          Mes clients
        </h1>
        <p className="mt-1 text-xs text-ep-muted">
          {clients.length} client{clients.length !== 1 ? "s" : ""} au total
        </p>
      </div>

      <ClientsSection clients={clients} />
    </div>
  );
}
