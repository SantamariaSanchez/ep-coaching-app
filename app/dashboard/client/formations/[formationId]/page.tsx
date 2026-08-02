import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { isSubscribed } from "@/utils/auth-client";
import { getFormationWithModules, getUserProgress, countLessons } from "@/utils/formations";
import { ChevronLeft, PlayCircle, CheckCircle2, Clock, Lock, Crown, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FormationDetailPage({
  params,
}: {
  params: Promise<{ formationId: string }>;
}) {
  const { formationId } = await params;

  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");
  const isFreeTier = !isSubscribed(profile);

  const [formation, completed] = await Promise.all([
    getFormationWithModules(formationId),
    getUserProgress(user.id),
  ]);

  if (!formation) notFound();

  const { published, totalMin } = countLessons(formation.modules);
  const completedCount = formation.modules
    .flatMap((m) => m.sections.flatMap((s) => s.lessons))
    .filter((l) => completed.has(l.id)).length;
  const pct = published > 0 ? Math.round((completedCount / published) * 100) : 0;

  return (
    <div
      className="page-transition"
      style={{ padding: "32px 20px 100px", maxWidth: 600, margin: "0 auto" }}
    >
      {/* Back */}
      <Link
        href="/dashboard/client/formations"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: "rgba(245,237,237,0.3)", textDecoration: "none",
          fontSize: 11, fontWeight: 600, marginBottom: 20, letterSpacing: "0.05em",
        }}
        className="animate-fade-in"
      >
        <ChevronLeft size={13} /> Formations
      </Link>

      {/* Header card */}
      <div
        className="ep-card-hero animate-fade-up"
        style={{ padding: "24px 20px", marginBottom: 24 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "rgba(224,30,30,0.12)",
            border: "1px solid rgba(224,30,30,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
          }}>
            {formation.emoji}
          </div>
          <div>
            <p className="ep-section-title" style={{ marginBottom: 2 }}>Formation</p>
            <h1 style={{
              fontSize: 20, fontWeight: 900, letterSpacing: "-0.03em",
              color: "#F5EDED", margin: 0, lineHeight: 1.1,
            }}>
              {formation.title}
            </h1>
          </div>
        </div>

        {formation.description && (
          <p style={{ fontSize: 13, color: "rgba(245,237,237,0.55)", lineHeight: 1.65, margin: "0 0 16px" }}>
            {formation.description}
          </p>
        )}

        {/* Stats row */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          {[
            { icon: PlayCircle, label: `${published} vidéo${published !== 1 ? "s" : ""}` },
            { icon: Clock, label: `${Math.round(totalMin / 60)}h${totalMin % 60 > 0 ? ` ${totalMin % 60}min` : ""}` },
            { icon: CheckCircle2, label: `${completedCount} terminée${completedCount !== 1 ? "s" : ""}` },
          ].map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Icon size={12} style={{ color: "rgba(224,30,30,0.6)" }} strokeWidth={2} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(245,237,237,0.45)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span className="ep-label">Progression</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: pct >= 100 ? "#4ade80" : "rgba(245,237,237,0.5)" }}>
              {pct}%
            </span>
          </div>
          <div style={{ height: 4, background: "rgba(224,30,30,0.10)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: pct >= 100 ? "#4ade80" : "linear-gradient(90deg, #E01E1E, #B00202)",
              borderRadius: 2,
              transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
            }} />
          </div>
        </div>
      </div>

      {/* Free tier upsell */}
      {isFreeTier && (
        <div
          className="ep-card animate-fade-up"
          style={{
            padding: "16px 18px",
            marginBottom: 20,
            background: "linear-gradient(135deg, rgba(224,30,30,0.1) 0%, rgba(137,4,4,0.04) 100%)",
            border: "1px solid rgba(224,30,30,0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Crown size={13} style={{ color: "#E01E1E" }} />
            <p style={{ fontSize: 12, fontWeight: 800, color: "#F5EDED", margin: 0 }}>
              Vidéos réservées aux clients coachés
            </p>
          </div>
          <p style={{ fontSize: 11, color: "rgba(245,237,237,0.5)", margin: "0 0 10px", lineHeight: 1.5 }}>
            Tu peux parcourir tout le programme dès maintenant — les vidéos se débloquent avec l&apos;accompagnement.
          </p>
          <Link href="/dashboard/client/abonnement" className="ep-btn-primary" style={{ fontSize: 11, textDecoration: "none" }}>
            Réserver un appel découverte
          </Link>
        </div>
      )}

      {/* Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {formation.modules.length === 0 ? (
          <div className="ep-card" style={{ padding: "36px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "rgba(245,237,237,0.35)", margin: 0 }}>
              Les sections seront disponibles prochainement
            </p>
          </div>
        ) : (
          formation.modules.map((mod, mi) => {
            const allModLessons = mod.sections.flatMap((s) => s.lessons);
            const modCompleted = allModLessons.filter((l) => completed.has(l.id)).length;
            const modPublished = allModLessons.filter((l) => l.is_published && l.youtube_id).length;

            return (
              <div
                key={mod.id}
                className="ep-card animate-fade-up"
                style={{ animationDelay: `${mi * 60}ms`, overflow: "hidden" }}
              >
                {/* Module header */}
                <div style={{
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid rgba(224,30,30,0.08)",
                }}>
                  <div>
                    <p style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: "0.18em",
                      textTransform: "uppercase", color: "rgba(224,30,30,0.55)",
                      margin: "0 0 2px",
                    }}>
                      Section {mi + 1}
                    </p>
                    <h3 style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em", color: "#F5EDED", margin: 0 }}>
                      {mod.title}
                    </h3>
                  </div>
                  {modPublished > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: "rgba(245,237,237,0.3)",
                      background: "rgba(255,255,255,0.04)",
                      padding: "3px 8px", borderRadius: 6,
                    }}>
                      {modCompleted}/{modPublished}
                    </span>
                  )}
                </div>

                {/* Sections */}
                <div>
                  {mod.sections.length === 0 && (
                    <div style={{ padding: "16px 18px" }}>
                      <p style={{ fontSize: 12, color: "rgba(245,237,237,0.2)", margin: 0, fontStyle: "italic" }}>
                        Vidéos bientôt disponibles
                      </p>
                    </div>
                  )}
                  {mod.sections.map((sec, si) => {
                    const secPublished = sec.lessons.filter((l) => l.is_published && l.youtube_id);
                    if (secPublished.length === 0 && sec.lessons.length > 0) {
                      return (
                        <div key={sec.id} style={{ padding: "10px 18px", borderTop: si > 0 ? "1px solid rgba(224,30,30,0.05)" : "none" }}>
                          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(224,30,30,0.35)", margin: "0 0 6px" }}>
                            {sec.title}
                          </p>
                          <p style={{ fontSize: 11, color: "rgba(245,237,237,0.2)", margin: 0, fontStyle: "italic" }}>
                            Bientôt disponible
                          </p>
                        </div>
                      );
                    }
                    if (secPublished.length === 0) return null;

                    return (
                      <div key={sec.id} style={{ borderTop: si > 0 ? "1px solid rgba(224,30,30,0.06)" : "none" }}>
                        {/* Section label */}
                        <div style={{ padding: "10px 18px 4px" }}>
                          <p style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
                            textTransform: "uppercase", color: "rgba(224,30,30,0.4)",
                            margin: 0,
                          }}>
                            {sec.title}
                          </p>
                        </div>

                        {/* Lessons */}
                        {sec.lessons.map((lesson, li) => {
                          const isPublished = !!(lesson.is_published && lesson.youtube_id);
                          const isAvailable = isPublished && !isFreeTier;
                          const isPremiumLocked = isPublished && isFreeTier;
                          const isDone = completed.has(lesson.id);

                          return (
                            <div key={lesson.id}>
                              {li > 0 && (
                                <div style={{ height: 1, background: "rgba(224,30,30,0.04)", margin: "0 18px" }} />
                              )}
                              {isAvailable ? (
                                <Link
                                  href={`/dashboard/client/formations/${formationId}/${lesson.id}`}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "11px 18px",
                                    textDecoration: "none",
                                  }}
                                  className="ep-lesson-row"
                                >
                                  <div style={{
                                    width: 26, height: 26, borderRadius: "50%",
                                    background: isDone ? "rgba(74,222,128,0.1)" : "rgba(224,30,30,0.08)",
                                    border: `1px solid ${isDone ? "rgba(74,222,128,0.3)" : "rgba(224,30,30,0.15)"}`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0,
                                  }}>
                                    {isDone
                                      ? <CheckCircle2 size={12} style={{ color: "#4ade80" }} />
                                      : <PlayCircle size={12} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
                                    }
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{
                                      fontSize: 12, fontWeight: isDone ? 600 : 700,
                                      color: isDone ? "rgba(245,237,237,0.45)" : "#F5EDED",
                                      margin: 0, lineHeight: 1.3,
                                      textDecoration: isDone ? "line-through" : "none",
                                      textDecorationColor: "rgba(245,237,237,0.2)",
                                    }}>
                                      {lesson.title}
                                    </p>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                    <span style={{ fontSize: 10, color: "rgba(245,237,237,0.2)", fontWeight: 600 }}>
                                      {lesson.duration_min}min
                                    </span>
                                    <ChevronRight size={13} style={{ color: "rgba(245,237,237,0.2)" }} />
                                  </div>
                                </Link>
                              ) : (
                                <div style={{
                                  display: "flex", alignItems: "center", gap: 12,
                                  padding: "11px 18px", opacity: isPremiumLocked ? 0.7 : 0.4,
                                }}>
                                  <div style={{
                                    width: 26, height: 26, borderRadius: "50%",
                                    background: isPremiumLocked ? "rgba(224,30,30,0.08)" : "rgba(255,255,255,0.03)",
                                    border: isPremiumLocked ? "1px solid rgba(224,30,30,0.2)" : "1px solid rgba(255,255,255,0.08)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0,
                                  }}>
                                    {isPremiumLocked
                                      ? <Crown size={10} style={{ color: "#E01E1E" }} />
                                      : <Lock size={10} style={{ color: "rgba(245,237,237,0.3)" }} />
                                    }
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: 12, color: isPremiumLocked ? "rgba(245,237,237,0.55)" : "rgba(245,237,237,0.4)", margin: 0 }}>
                                      {lesson.title}
                                    </p>
                                    {isPremiumLocked && (
                                      <p style={{ fontSize: 9.5, color: "rgba(224,30,30,0.6)", margin: "2px 0 0", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                        Réservé aux clients coachés
                                      </p>
                                    )}
                                  </div>
                                  <span style={{ fontSize: 10, color: "rgba(245,237,237,0.2)" }}>
                                    {lesson.duration_min}min
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
