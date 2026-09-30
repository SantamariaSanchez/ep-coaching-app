import Link from "next/link";
import { getAppSetup } from "@/lib/app-setup-server";
import { isOn } from "@/lib/app-setup";
import { redirect } from "next/navigation";
import { CalendarCheck, AlertTriangle, ArrowRight } from "lucide-react";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { todayInParis } from "@/lib/dates";
import { getWeeklyReview } from "@/lib/weekly-review";
import { addDaysToDate, MAX_WEEKS_BACK, mondayOf, resolveWeekStart } from "@/lib/weekly-review-helpers";
import WeeklyReview from "@/components/ui/WeeklyReview";
import WeeklyReviewReflection from "@/components/ui/WeeklyReviewReflection";

// Revue de la semaine, ouverte à TOUS les membres (gratuits compris) :
// contrairement au check-in, rien ici n'a besoin d'un coach pour être lu.
// Tout vient de ce que la personne a déjà noté ailleurs dans l'appli.
export default async function ClientSemainePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  // Le coach a sa propre revue dans son espace "Moi" (même contenu, même
  // navigation que le reste de son suivi perso).
  if (profile?.role === "coach") redirect("/dashboard/coach/moi/semaine");

  const sp = await searchParams;
  const param = typeof sp.semaine === "string" ? sp.semaine : null;
  const today = todayInParis();
  const weekStart = resolveWeekStart(param, today);
  const currentMonday = mondayOf(today);
  const [data, appSetup] = await Promise.all([getWeeklyReview(user.id, weekStart, today), getAppSetup(user.id)]);

  return (
    <div className="px-5 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1 flex items-center gap-1.5">
          <CalendarCheck size={11} /> Suivi
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Ma semaine</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Tout ce que tu as noté cette semaine, en un coup d&apos;œil. Puis 2 minutes de recul pour
          préparer la suivante.
        </p>
      </div>

      {data ? (
        <div className="flex flex-col gap-3">
          <WeeklyReview
            show={{ entrainement: isOn(appSetup, "entrainement"), nutrition: isOn(appSetup, "nutrition"), pas: isOn(appSetup, "pas"), sommeil: isOn(appSetup, "sommeil"), poids: isOn(appSetup, "poids") }}
            data={data}
            basePath="/dashboard/client/semaine"
            today={today}
            canGoNext={weekStart < currentMonday}
            canGoPrev={weekStart > addDaysToDate(currentMonday, -7 * MAX_WEEKS_BACK)}
          />
          <WeeklyReviewReflection key={data.weekStart} weekStart={data.weekStart} existing={data.reflection} />
        </div>
      ) : (
        <div className="ep-card" style={{ padding: "20px 18px" }} role="alert">
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#fbbf24", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={15} /> Impossible de charger ta semaine
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "rgba(245,237,237,0.45)", lineHeight: 1.5 }}>
            Tes données sont intactes, c&apos;est la lecture qui a échoué. Recharge la page dans un instant.
          </p>
        </div>
      )}

      {/* Membre gratuit : invitation discrète à faire relire sa revue par un
          coach, sans jamais bloquer la revue elle-même. */}
      {!isSubscribed(profile) && (
        <Link
          href="/dashboard/client/abonnement"
          className="ep-card ep-press flex items-center justify-between gap-3"
          style={{ marginTop: 12, padding: "14px 18px", textDecoration: "none" }}
        >
          <div className="min-w-0">
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>
              Envoie ta revue à un coach chaque semaine
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "rgba(245,237,237,0.4)", lineHeight: 1.45 }}>
              Avec l&apos;accompagnement, ton coach la lit et te répond avec tes ajustements.
            </p>
          </div>
          <ArrowRight size={16} style={{ color: "#E01E1E", flexShrink: 0 }} />
        </Link>
      )}
    </div>
  );
}
