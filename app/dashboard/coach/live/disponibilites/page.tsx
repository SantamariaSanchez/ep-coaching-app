import { redirect } from "next/navigation";
import { Eye } from "lucide-react";
import { getUser, getProfile } from "@/utils/auth";
import { getAvailableSlotsForCoach } from "@/utils/live-events";
import { capitalize, formatLiveDateTime } from "@/lib/live-time";
import { getMyAvailabilityRules } from "../actions";
import AvailabilityManager from "@/components/coach/AvailabilityManager";
import BackButton from "@/components/ui/BackButton";

export default async function CoachAvailabilityPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client/live");

  const [rules, slots] = await Promise.all([
    getMyAvailabilityRules(),
    getAvailableSlotsForCoach(user.id),
  ]);
  // Aperçu de ce que voient réellement tes clients : les règles sont
  // désormais lues en heure de Paris (avant, le serveur UTC les décalait de
  // 1 à 2 h), mieux vaut pouvoir vérifier d'un coup d'oeil le premier
  // créneau proposé.
  const preview = slots.slice(0, 3);

  return (
    <div className="px-6 py-8 ep-page-medium pb-24 md:pb-8 page-transition">
      <BackButton fallbackHref="/dashboard/coach/live" />
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Live
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Mes disponibilités</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Définis tes créneaux récurrents : tes clients réservent directement un appel 1:1 dans un
          créneau libre, sans que tu aies à le programmer toi-même. Toutes les heures sont en heure
          de Paris, et un créneau qui chevauche un live déjà au planning n&apos;est jamais proposé.
        </p>
      </div>

      {rules.length > 0 && (
        <div className="ep-card" style={{ padding: "14px 16px", marginBottom: 20 }}>
          <p className="ep-label" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
            <Eye size={11} /> Ce que voient tes clients
          </p>
          {preview.length > 0 ? (
            <>
              <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.7)", margin: 0, lineHeight: 1.6 }}>
                Prochains créneaux libres :{" "}
                {preview.map((s) => capitalize(formatLiveDateTime(s.startsAt))).join(", ")}.
              </p>
              <p style={{ fontSize: 11, color: "rgba(245,237,237,0.35)", margin: "4px 0 0" }}>
                {slots.length} créneau{slots.length > 1 ? "x" : ""} proposé{slots.length > 1 ? "s" : ""} sur les 14 prochains jours.
              </p>
            </>
          ) : (
            <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.5)", margin: 0 }}>
              Aucun créneau libre sur les 14 prochains jours : ton planning est plein ou tes plages sont trop courtes.
            </p>
          )}
        </div>
      )}

      <AvailabilityManager initialRules={rules} />
    </div>
  );
}
