import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { isSubscribed } from "@/utils/auth-client";
import { getFormations, getUserProgress, getFormationWithModules, countLessons, getResumeLesson } from "@/utils/formations";
import { BookOpen, Lock, Crown, PlayCircle, ChevronRight, Clock, Play } from "lucide-react";

export const dynamic = "force-dynamic";

const FORMATION_COLORS = [
  { from: "#E01E1E", to: "#890404", shadow: "rgba(224,30,30,0.25)" },
  { from: "#7c3aed", to: "#4c1d95", shadow: "rgba(124,58,237,0.25)" },
  { from: "#0891b2", to: "#164e63", shadow: "rgba(8,145,178,0.25)" },
  { from: "#059669", to: "#064e3b", shadow: "rgba(5,150,105,0.25)" },
  { from: "#d97706", to: "#78350f", shadow: "rgba(217,119,6,0.25)" },
];

export default async function FormationsPage() {
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  // Retombait sur le dashboard générique au lieu de son propre catalogue de
  // formations (app/dashboard/coach/moi/formations existe déjà) — même
  // trou trouvé sur plusieurs pages client en auditant public/manifest.json.
  if (profile?.role === "coach") redirect("/dashboard/coach/moi/formations");
  // Un membre gratuit parcourt le catalogue complet (structure, titres,
  // durées) pour se donner envie — seules les vidéos restent réservées aux
  // clients coachés, verrouillées plus bas plutôt que la page entière.
  const isFreeTier = !isSubscribed(profile);

  const [formations, completed, resumeLesson] = await Promise.all([
    getFormations(),
    getUserProgress(user.id),
    // Réservé aux clients coachés — un membre gratuit n'a jamais pu ouvrir
    // de leçon (redirigé plus haut dans la page de leçon), donc rien à
    // reprendre.
    isFreeTier ? Promise.resolve(null) : getResumeLesson(user.id),
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
        <h1 className="ep-h1" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BookOpen size={26} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
          Formations
        </h1>
        <p style={{ marginTop: 6, fontSize: 12, color: "rgba(245,237,237,0.3)", fontWeight: 500 }}>
          {totalLessons} vidéo{totalLessons !== 1 ? "s" : ""} disponibles
          {totalMin > 0 && ` · ${Math.round(totalMin / 60)}h de contenu`}
        </p>
      </div>

      {/* Reprendre où on en était */}
      {resumeLesson && (
        <Link
          href={`/dashboard/client/formations/${resumeLesson.formationId}/${resumeLesson.lessonId}`}
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

      {/* Free tier upsell */}
      {isFreeTier && (
        <div
          className="ep-card animate-fade-up stagger-1"
          style={{
            padding: "18px 20px",
            marginBottom: 24,
            background: "linear-gradient(135deg, rgba(224,30,30,0.1) 0%, rgba(137,4,4,0.04) 100%)",
            border: "1px solid rgba(224,30,30,0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Crown size={14} style={{ color: "#E01E1E" }} />
            <p style={{ fontSize: 12.5, fontWeight: 800, color: "#F5EDED", margin: 0 }}>
              {totalLessons} vidéo{totalLessons !== 1 ? "s" : ""} t&apos;attend{totalLessons !== 1 ? "ent" : ""}
            </p>
          </div>
          <p style={{ fontSize: 11.5, color: "rgba(245,237,237,0.5)", margin: "0 0 12px", lineHeight: 1.5 }}>
            Parcours le catalogue librement. Les vidéos se débloquent dès que tu rejoins l&apos;accompagnement.
          </p>
          <Link href="/dashboard/client/abonnement" className="ep-btn-primary" style={{ fontSize: 11, textDecoration: "none" }}>
            Réserver un appel découverte
          </Link>
        </div>
      )}

      {/* Global progress */}
      {!isFreeTier && totalLessons > 0 && (
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

      {/* Formations grid */}
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
                href={isAvailable ? `/dashboard/client/formations/${formation.id}` : "#"}
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
                  // pointerEvents plutôt qu'un onClick preventDefault : un
                  // gestionnaire d'événement passé à un Link depuis un composant
                  // serveur fait planter le rendu ("Event handlers cannot be
                  // passed to Client Component props"), vécu en prod le
                  // 2026-08-05 dès qu'une formation avait 0 vidéo publiée.
                  pointerEvents: isAvailable ? "auto" : "none",
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
                          <Lock size={10} style={{ color: "rgba(245,237,237,0.2)" }} />
                        )}
                        {isAvailable && isFreeTier && (
                          <Crown size={10} style={{ color: "#E01E1E" }} />
                        )}
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.03em", color: "#F5EDED", margin: "0 0 4px", lineHeight: 1.2 }}>
                        {formation.title}
                      </h3>
                      {formation.subtitle && (
                        <p style={{ fontSize: 12, color: "rgba(245,237,237,0.4)", margin: "0 0 10px", lineHeight: 1.4 }}>
                          {formation.subtitle}
                        </p>
                      )}

                      {/* Meta */}
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

                    {/* Arrow or lock */}
                    {isAvailable ? (
                      <ChevronRight size={18} style={{ color: "rgba(245,237,237,0.2)", flexShrink: 0, marginTop: 4 }} />
                    ) : (
                      <Lock size={16} style={{ color: "rgba(245,237,237,0.15)", flexShrink: 0, marginTop: 4 }} />
                    )}
                  </div>

                  {/* Progress bar */}
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
