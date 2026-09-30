import { redirect } from "next/navigation";
import { getAppSetup } from "@/lib/app-setup-server";
import { isOn } from "@/lib/app-setup";
import { CalendarCheck, AlertTriangle } from "lucide-react";
import { getUser, getProfile } from "@/utils/auth";
import { todayInParis } from "@/lib/dates";
import { getWeeklyReview } from "@/lib/weekly-review";
import { addDaysToDate, MAX_WEEKS_BACK, mondayOf, resolveWeekStart } from "@/lib/weekly-review-helpers";
import WeeklyReview from "@/components/ui/WeeklyReview";
import WeeklyReviewReflection from "@/components/ui/WeeklyReviewReflection";

// Revue de la semaine du coach sur son PROPRE suivi (espace "Moi") : le
// rituel de pilotage perso du dimanche qui manquait, même contenu que la
// version membre. Aucune ligne check_ins n'est écrite (voir
// app/dashboard/client/semaine/actions.ts).
export default async function CoachMoiSemainePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getUser();
  if (!user) redirect("/");

  // Même garde que les autres pages "Moi" (voir moi/agenda/page.tsx).
  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client/semaine");

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
          <CalendarCheck size={11} /> Mon suivi
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Ma semaine</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Ta semaine en chiffres, à partir de ce que tu as déjà noté. Puis 2 minutes de recul pour
          caler la suivante.
        </p>
      </div>

      {data ? (
        <div className="flex flex-col gap-3">
          <WeeklyReview
            show={{ entrainement: isOn(appSetup, "entrainement"), nutrition: isOn(appSetup, "nutrition"), pas: isOn(appSetup, "pas"), sommeil: isOn(appSetup, "sommeil"), poids: isOn(appSetup, "poids") }}
            data={data}
            basePath="/dashboard/coach/moi/semaine"
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
    </div>
  );
}
