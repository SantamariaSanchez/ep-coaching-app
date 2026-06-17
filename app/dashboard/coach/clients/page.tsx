import { redirect } from "next/navigation";
import { getUser, getProfile, getClients } from "@/utils/auth";
import ClientsSection from "@/components/ui/ClientsSection";

export default async function ClientsPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const [profile, clients] = await Promise.all([
    getProfile(user.id),
    getClients(),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");

  return (
    <div className="page-transition" style={{ padding: "32px 24px 48px", maxWidth: 900, margin: "0 auto" }}>
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Gestion</p>
        <h1 style={{
          fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em",
          color: "#F5EDED", margin: 0, lineHeight: 1.05,
        }}>
          Mes clients
        </h1>
        <p style={{ marginTop: 6, fontSize: 12, color: "rgba(245,237,237,0.3)", fontWeight: 500 }}>
          {clients.length} client{clients.length !== 1 ? "s" : ""} au total
        </p>
      </div>

      <ClientsSection clients={clients} />
    </div>
  );
}
