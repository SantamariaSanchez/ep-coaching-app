import { redirect } from "next/navigation";
import { getUser } from "@/utils/auth";
import { loadPerformance } from "@/lib/performance-server";
import PerformanceHub from "@/components/performance/PerformanceHub";

export const dynamic = "force-dynamic";

// Performances par discipline (course, Hyrox, CrossFit, force, rééducation,
// santé) : seulement celles que la personne a choisies dans Mon appli.
export default async function CoachPerformancesPage() {
  const user = await getUser();
  if (!user) redirect("/auth/coach");
  const perf = await loadPerformance(user.id);
  return (
    <div className="page-transition" style={{ maxWidth: 720, margin: "0 auto", padding: "28px 16px 96px" }}>
      <h1 className="ep-h1" style={{ marginBottom: 6 }}>Performances</h1>
      <p style={{ fontSize: 13.5, color: "rgba(245,237,237,0.55)", margin: "0 0 18px", lineHeight: 1.6 }}>Tes séances, tes chiffres et tes records, discipline par discipline.</p>
      <PerformanceHub disciplines={perf.disciplines} entries={perf.entries} bodyweightKg={perf.bodyweightKg} isWoman={perf.isWoman} currentPractices={perf.practices} />
    </div>
  );
}
