import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { getFormations, getUserProgress, getFormationWithModules, countLessons } from "@/utils/formations";
import { BookOpen, Lock, PlayCircle, ChevronRight, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

const FORMATION_COLORS = [
  { from: "var(--color-ep-red)", to: "var(--color-ep-dark-red)", shadow: "rgba(var(--color-ep-red-rgb),0.25)" },
  { from: "#7c3aed", to: "#4c1d95", shadow: "rgba(124,58,237,0.25)" },
  { from: "#0891b2", to: "#164e63", shadow: "rgba(8,145,178,0.25)" },
  { from: "#059669", to: "#064e3b", shadow: "rgba(5,150,105,0.25)" },
  { from: "#d97706", to: "#78350f", shadow: "rgba(217,119,6,0.25)" },
];

export default async function FormationsPage() {
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const [formations, completed] = await Promise.all([
    getFormations(),
    getUserProgress(user.id),
  ]);

  // Get module/lesson counts for each formation
  const formationData = await Promise.all(
    formations.map(async (f) => {
      const withModules = await getFormationWithModules(f.id);
      const counts = withModules ? countLessons(withModules.modules) : { total: 0, published: 0, totalMin: 0 };
      const completedCount = withModules
        ? withModules.modules.flatMap(m => m.sections.flatMap(s => s.lessons)).filter(l => completed.has(l.id)).length
        : 0;
      return { formation: f, ...counts, completedCount };
    })
  );

  const totalMin = formationData.reduce((s, d) => s + d.totalMin, 0);
  const totalLessons = formationData.reduce((s, d) => s + d.published, 0);
  const totalCompleted = formationData.reduce((s, d) => s + d.completedCount, 0);

  return (
    <div
      className="page-transition"
      style={{ padding: "32px 20px 100px", maxWidth: 600, margin: "0 auto" }}
    >
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Académie EP</p>
        <h1 style={{
          fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em",
          color: "var(--color-ep-light)", margin: 0, lineHeight: 1.05,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <BookOpen size={26} style={{ color: "var(--color-ep-red)" }} strokeWidth={1.8} />
          Formations
        </h1>
        <p style={{ marginTop: 6, fontSize: 12, color: "rgba(var(--color-ep-light-rgb),0.3)", fontWeight: 500 }}>
          {totalLessons} vidéo{totalLessons !== 1 ? "s" : ""} disponibles
          {totalMin > 0 && ` · ${Math.round(totalMin / 60)}h de contenu`}
        </p>
      </div>

      {/* Global progress */}
      {totalLessons > 0 && (
        <div className="ep-card animate-fade-up stagger-2" style={{ padding: "16px 20px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span className="ep-label">Progression globale</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--color-ep-light)" }}>
              {totalCompleted} / {totalLessons}
            </span>
          </div>
          <div style={{ height: 4, background: "rgba(var(--color-ep-red-rgb),0.12)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0}%`,
              background: "linear-gradient(90deg, var(--color-ep-red), var(--color-ep-med-red))",
              borderRadius: 2,
              transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
            }} />
          </div>
        </div>
      )}

      {/* Formations grid */}
      {formations.length === 0 ? (
        <div className="ep-card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <BookOpen size={36} style={{ color: "rgba(var(--color-ep-red-rgb),0.25)", margin: "0 auto 16px" }} strokeWidth={1.3} />
          <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(var(--color-ep-light-rgb),0.5)", margin: "0 0 6px" }}>
            Formations à venir
          </p>
          <p style={{ fontSize: 12, color: "rgba(var(--color-ep-light-rgb),0.25)", margin: 0 }}>
            Le contenu sera disponible très prochainement
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {formationData.map(({ formation, total, published, completedCount, totalMin: fMin }, i) => {
            const pct = published > 0 ? Math.round((completedCount / published) * 100) : 0;
            const col = FORMATION_COLORS[i % FORMATION_COLORS.length];
            const isAvailable = published > 0;

            return (
              <Link
                key={formation.id}
                href={isAvailable ? `/dashboard/client/formations/${formation.id}` : "#"}
                className="animate-fade-up"
                style={{
                  animationDelay: `${i * 60}ms`,
                  textDecoration: "none",
                  display: "block",
                  background: "rgba(16,1,1,0.60)",
                  backdropFilter: "blur(28px)",
                  WebkitBackdropFilter: "blur(28px)",
                  border: "1px solid rgba(var(--color-ep-red-rgb),0.13)",
                  borderRadius: "var(--radius-xl)",
                  overflow: "hidden",
                  opacity: isAvailable ? 1 : 0.65,
                  cursor: isAvailable ? "pointer" : "default",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)",
                }}
              >
                {/* Top color band */}
                <div style={{
                  height: 4,
                  background: `linear-gradient(90deg, ${col.from}, ${col.to})`,
                  boxShadow: `0 0 16px ${col.shadow}`,
                }} />

                <div style={{ padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    {/* Emoji icon */}
                    <div style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: `linear-gradient(135deg, ${col.from}22 0%, ${col.to}11 100%)`,
                      border: `1px solid ${col.from}33`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                      flexShrink: 0,
                    }}>
                      {formation.emoji}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: `${col.from}`, margin: 0 }}>
                          Formation {i + 1}
                        </p>
                        {!isAvailable && (
                          <Lock size={10} style={{ color: "rgba(var(--color-ep-light-rgb),0.2)" }} />
                        )}
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--color-ep-light)", margin: "0 0 4px", lineHeight: 1.2 }}>
                        {formation.title}
                      </h3>
                      {formation.subtitle && (
                        <p style={{ fontSize: 12, color: "rgba(var(--color-ep-light-rgb),0.4)", margin: "0 0 10px", lineHeight: 1.4 }}>
                          {formation.subtitle}
                        </p>
                      )}

                      {/* Meta */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color: "rgba(var(--color-ep-light-rgb),0.3)" }}>
                          <PlayCircle size={10} />
                          {published} vidéo{published !== 1 ? "s" : ""}
                        </span>
                        {fMin > 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color: "rgba(var(--color-ep-light-rgb),0.3)" }}>
                            <Clock size={10} />
                            {Math.round(fMin / 60)}h{fMin % 60 > 0 ? `${fMin % 60}min` : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow or lock */}
                    {isAvailable ? (
                      <ChevronRight size={18} style={{ color: "rgba(var(--color-ep-light-rgb),0.2)", flexShrink: 0, marginTop: 4 }} />
                    ) : (
                      <Lock size={16} style={{ color: "rgba(var(--color-ep-light-rgb),0.15)", flexShrink: 0, marginTop: 4 }} />
                    )}
                  </div>

                  {/* Progress bar */}
                  {isAvailable && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(var(--color-ep-light-rgb),0.25)", letterSpacing: "0.08em" }}>
                          PROGRESSION
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: pct >= 100 ? "#4ade80" : "rgba(var(--color-ep-light-rgb),0.4)" }}>
                          {completedCount}/{published}
                        </span>
                      </div>
                      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: pct >= 100 ? "#4ade80" : `linear-gradient(90deg, ${col.from}, ${col.to})`,
                          borderRadius: 2,
                          boxShadow: pct > 0 ? `0 0 8px ${col.shadow}` : "none",
                        }} />
                      </div>
                    </div>
                  )}

                  {!isAvailable && (
                    <div style={{ marginTop: 12 }}>
                      <span className="ep-badge-subtle">Bientôt disponible</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
