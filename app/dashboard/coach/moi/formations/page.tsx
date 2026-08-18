import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { getFormations, getUserProgress, getFormationWithModules, countLessons, getResumeLesson } from "@/utils/formations";
import { BookOpen, PlayCircle, ChevronRight, Clock, Play } from "lucide-react";

export const dynamic = "force-dynamic";

// Catalogue "Moi" du coach sur les Formations — jusqu'ici, un coach était
// systématiquement redirigé hors de /dashboard/client/formations (guard
// `if (profile?.role === "coach") redirect(...)`) et il n'existait aucune
// route coach/moi équivalente : aucune manière de suivre ses propres
// formations, y compris ENTREPRENARIAL SECRET (construction d'une activité
// de coaching) et PSYCHOLOGIE AFFECT, deux formations écrites pour un
// coach autant que pour un client. Trouvé en auditant "Formations"
// (demande explicite 2026-08-19), corrigé en donnant au coach le même
// accès qu'un client sur son propre contenu, en reprenant les mêmes
// fonctions utilitaires génériques (utils/formations.ts, déjà indexées par
// userId, jamais clientId).
//
// Contrairement à la version client, pas de notion de "membre gratuit" ici
// (le compte coach n'est jamais free tier) : toute leçon publiée est
// directement accessible, pas de bandeau d'upsell.
const FORMATION_COLORS = [
  { from: "#E01E1E", to: "#890404", shadow: "rgba(224,30,30,0.25)" },
  { from: "#7c3aed", to: "#4c1d95", shadow: "rgba(124,58,237,0.25)" },
  { from: "#0891b2", to: "#164e63", shadow: "rgba(8,145,178,0.25)" },
  { from: "#059669", to: "#064e3b", shadow: "rgba(5,150,105,0.25)" },
  { from: "#d97706", to: "#78350f", shadow: "rgba(217,119,6,0.25)" },
];

export default async function CoachMoiFormationsPage() {
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") redirect("/dashboard/client/formations");

  const [formations, completed, resumeLesson] = await Promise.all([
    getFormations(),
    getUserProgress(user.id),
    getResumeLesson(user.id),
  ]);

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
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Académie EP</p>
        <h1 className="ep-h1" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BookOpen size={26} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
          Formations
        </h1>
        <p style={{ marginTop: 6, fontSize: 12, color: "rgba(245,237,237,0.3)", fontWeight: 500 }}>
          {totalLessons} vidéo{totalLessons !== 1 ? "s" : ""} disponibles
          {totalMin > 0 && ` · ${Math.round(totalMin / 60)}h de contenu`}
        </p>
      </div>

      {resumeLesson && (
        <Link
          href={`/dashboard/coach/moi/formations/${resumeLesson.formationId}/${resumeLesson.lessonId}`}
          className="ep-card animate-fade-up"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 18px",
            marginBottom: 20,
            textDecoration: "none",
            background: "linear-gradient(135deg, rgba(224,30,30,0.12) 0%, rgba(137,4,4,0.05) 100%)",
            border: "1px solid rgba(224,30,30,0.3)",
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
            background: "rgba(224,30,30,0.15)", border: "1px solid rgba(224,30,30,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Play size={16} style={{ color: "#E01E1E" }} strokeWidth={2} fill="#E01E1E" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(224,30,30,0.7)", margin: "0 0 3px" }}>
              Reprendre {resumeLesson.formationEmoji} {resumeLesson.formationTitle}
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#F5EDED", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {resumeLesson.lessonTitle}
            </p>
          </div>
          <ChevronRight size={16} style={{ color: "rgba(245,237,237,0.3)", flexShrink: 0 }} />
        </Link>
      )}

      {totalLessons > 0 && (
        <div className="ep-card animate-fade-up stagger-2" style={{ padding: "16px 20px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span className="ep-label">Progression globale</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#F5EDED" }}>
              {totalCompleted} / {totalLessons}
            </span>
          </div>
          <div style={{ height: 4, background: "rgba(224,30,30,0.12)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0}%`,
              background: "linear-gradient(90deg, #E01E1E, #B00202)",
              borderRadius: 2,
              transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
            }} />
          </div>
        </div>
      )}

      {formations.length === 0 ? (
        <div className="ep-card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <BookOpen size={36} style={{ color: "rgba(224,30,30,0.25)", margin: "0 auto 16px" }} strokeWidth={1.3} />
          <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(245,237,237,0.5)", margin: "0 0 6px" }}>
            Formations à venir
          </p>
          <p style={{ fontSize: 12, color: "rgba(245,237,237,0.25)", margin: 0 }}>
            Le contenu sera disponible très prochainement
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {formationData.map(({ formation, published, completedCount, totalMin: fMin }, i) => {
            const pct = published > 0 ? Math.round((completedCount / published) * 100) : 0;
            const col = FORMATION_COLORS[i % FORMATION_COLORS.length];
            const isAvailable = published > 0;

            return (
              <Link
                key={formation.id}
                href={isAvailable ? `/dashboard/coach/moi/formations/${formation.id}` : "#"}
                aria-disabled={!isAvailable}
                tabIndex={isAvailable ? undefined : -1}
                className="ep-card animate-fade-up"
                style={{
                  animationDelay: `${i * 60}ms`,
                  textDecoration: "none",
                  display: "block",
                  borderRadius: "var(--radius-xl)",
                  opacity: isAvailable ? 1 : 0.65,
                  cursor: isAvailable ? "pointer" : "default",
                  pointerEvents: isAvailable ? "auto" : "none",
                }}
              >
                <div style={{
                  height: 4,
                  background: `linear-gradient(90deg, ${col.from}, ${col.to})`,
                  boxShadow: `0 0 16px ${col.shadow}`,
                }} />

                <div style={{ padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
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

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: `${col.from}`, margin: "0 0 2px" }}>
                        Formation {i + 1}
                      </p>
                      <h3 style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.03em", color: "#F5EDED", margin: "0 0 4px", lineHeight: 1.2 }}>
                        {formation.title}
                      </h3>
                      {formation.subtitle && (
                        <p style={{ fontSize: 12, color: "rgba(245,237,237,0.4)", margin: "0 0 10px", lineHeight: 1.4 }}>
                          {formation.subtitle}
                        </p>
                      )}

                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color: "rgba(245,237,237,0.3)" }}>
                          <PlayCircle size={10} />
                          {published} vidéo{published !== 1 ? "s" : ""}
                        </span>
                        {fMin > 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color: "rgba(245,237,237,0.3)" }}>
                            <Clock size={10} />
                            {Math.round(fMin / 60)}h{fMin % 60 > 0 ? `${fMin % 60}min` : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {isAvailable && (
                      <ChevronRight size={18} style={{ color: "rgba(245,237,237,0.2)", flexShrink: 0, marginTop: 4 }} />
                    )}
                  </div>

                  {isAvailable && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(245,237,237,0.25)", letterSpacing: "0.08em" }}>
                          PROGRESSION
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: pct >= 100 ? "#4ade80" : "rgba(245,237,237,0.4)" }}>
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
