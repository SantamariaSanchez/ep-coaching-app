import { getT } from "@/lib/i18n-server";
import { redirect, notFound } from "next/navigation";
import NotInIOSApp from "@/components/native/NotInIOSApp";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { isSubscribed } from "@/utils/auth-client";
import { getFormationWithModules, getUserProgress, countLessons, formatDuration, isLessonWatchable, hasFormationAccess } from "@/utils/formations";
import { ChevronLeft, PlayCircle, CheckCircle2, Clock, Lock, Crown, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FormationDetailPage({
  params,
}: {
  params: Promise<{ formationId: string }>;
}) {
  const t = await getT();
  const { formationId } = await params;

  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  // Préserve la formation ciblée (app/dashboard/coach/moi/formations/[formationId]
  // existe) plutôt que de retomber sur le dashboard générique — même trou
  // trouvé sur plusieurs pages client en auditant public/manifest.json.
  if (profile?.role === "coach") redirect(`/dashboard/coach/moi/formations/${formationId}`);
  const isFreeTier = !isSubscribed(profile);

  const [formation, completed] = await Promise.all([
    getFormationWithModules(formationId),
    getUserProgress(user.id),
  ]);

  if (!formation) notFound();
  // Formation en brouillon : invisible pour un membre, même par lien direct
  // (le catalogue n'en montre qu'un teaser "Bientôt disponible").
  if (!formation.is_published) notFound();
  // Formation d'un coach (2026-09-30) : visible par ses clients et par les
  // personnes à qui il a donné l'accès ; vidéos selon le mode d'accès.
  const coachFormation = !!formation.owner_id;
  const hasAccess = await hasFormationAccess(formation, { id: user.id, coach_id: profile?.coach_id ?? null, subscription_status: profile?.subscription_status ?? null });
  if (coachFormation && !hasAccess && profile?.coach_id !== formation.owner_id) notFound();
  const locked = coachFormation ? !hasAccess : isFreeTier;

  const { published, publishedMin } = countLessons(formation.modules);
  // Seules les leçons regardables comptent : une leçon terminée puis
  // dépubliée ne doit pas faire dépasser 100 %.
  const completedCount = formation.modules
    .flatMap((m) => m.sections.flatMap((s) => s.lessons))
    .filter((l) => isLessonWatchable(l) && completed.has(l.id)).length;
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
          color: "rgba(var(--ep-ink-rgb),0.3)", textDecoration: "none",
          fontSize: 11, fontWeight: 600, marginBottom: 20, letterSpacing: "0.05em",
        }}
        className="animate-fade-in"
      >
        <ChevronLeft size={13} />{" "}{t("Formations")}
      </Link>

      {/* Header card */}
      <div
        className="ep-card-hero animate-fade-up"
        style={{ padding: "24px 20px", marginBottom: 24 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "rgba(var(--ep-accent-rgb),0.12)",
            border: "1px solid rgba(var(--ep-accent-rgb),0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
          }}>
            {formation.emoji}
          </div>
          <div>
            <p className="ep-section-title" style={{ marginBottom: 2 }}>{t("Formation")}</p>
            <h1 style={{
              fontSize: 20, fontWeight: 900, letterSpacing: "-0.03em",
              color: "var(--ep-ink)", margin: 0, lineHeight: 1.1,
            }}>
              {formation.title}
            </h1>
          </div>
        </div>

        {formation.description && (
          <p style={{ fontSize: 13, color: "rgba(var(--ep-ink-rgb),0.55)", lineHeight: 1.65, margin: "0 0 16px" }}>
            {formation.description}
          </p>
        )}

        {/* Stats row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginBottom: 16 }}>
          {[
            { icon: PlayCircle, label: `${published} vidéo${published !== 1 ? "s" : ""}` },
            ...(publishedMin > 0 ? [{ icon: Clock, label: formatDuration(publishedMin) }] : []),
            { icon: CheckCircle2, label: `${completedCount} terminée${completedCount !== 1 ? "s" : ""}` },
          ].map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Icon size={12} style={{ color: "rgba(var(--ep-accent-rgb),0.6)" }} strokeWidth={2} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(var(--ep-ink-rgb),0.45)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span className="ep-label">{t("Progression")}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: pct >= 100 ? "var(--ep-ok)" : "rgba(var(--ep-ink-rgb),0.5)" }}>
              {pct}%
            </span>
          </div>
          <div style={{ height: 4, background: "rgba(var(--ep-accent-rgb),0.10)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: pct >= 100 ? "var(--ep-ok)" : "linear-gradient(90deg, var(--ep-accent), var(--ep-accent-2))",
              borderRadius: 2,
              transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
            }} />
          </div>
        </div>
      </div>

      {/* Formation payante d'un coach, pas encore achetée */}
      {locked && coachFormation && (
        <div className="ep-card animate-fade-up" style={{ padding: "16px 18px", marginBottom: 20, background: "linear-gradient(135deg, rgba(var(--ep-accent-rgb),0.1) 0%, rgba(var(--ep-line-rgb),0.04) 100%)", border: "1px solid rgba(var(--ep-accent-rgb),0.25)" }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: "var(--ep-ink)", margin: "0 0 6px", display: "flex", alignItems: "center", gap: 8 }}>
            <Lock size={13} style={{ color: "var(--ep-accent)" }} />{" "}{t("Formation proposée par ton coach")}{formation.price_eur ? ` · ${formation.price_eur} €` : ""}
          </p>
          <p style={{ fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.5)", margin: "0 0 10px", lineHeight: 1.5 }}>
            {t("Tu peux parcourir tout le programme. Les vidéos se débloquent dès que ton coach t'a donné l'accès.")}
          </p>
          {formation.payment_url && (
            <NotInIOSApp>
              <a href={formation.payment_url} target="_blank" rel="noopener noreferrer" className="ep-btn-primary" style={{ fontSize: 11, textDecoration: "none" }}>
                {t("Acheter la formation")}
              </a>
            </NotInIOSApp>
          )}
        </div>
      )}

      {/* Free tier upsell */}
      {locked && !coachFormation && (
        <div
          className="ep-card animate-fade-up"
          style={{
            padding: "16px 18px",
            marginBottom: 20,
            background: "linear-gradient(135deg, rgba(var(--ep-accent-rgb),0.1) 0%, rgba(var(--ep-line-rgb),0.04) 100%)",
            border: "1px solid rgba(var(--ep-accent-rgb),0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Crown size={13} style={{ color: "var(--ep-accent)" }} />
            <p style={{ fontSize: 12, fontWeight: 800, color: "var(--ep-ink)", margin: 0 }}>
              {t("Vidéos réservées aux clients coachés")}
            </p>
          </div>
          <p style={{ fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.5)", margin: "0 0 10px", lineHeight: 1.5 }}>
            {t("Tu peux parcourir tout le programme dès maintenant. Les vidéos se débloquent avec l'accompagnement.")}
          </p>
          <Link href="/dashboard/client/abonnement" className="ep-btn-primary" style={{ fontSize: 11, textDecoration: "none" }}>
            {t("Réserver un appel découverte")}
          </Link>
        </div>
      )}

      {/* Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {formation.modules.length === 0 ? (
          <div className="ep-card" style={{ padding: "36px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "rgba(var(--ep-ink-rgb),0.35)", margin: 0 }}>
              {t("Les sections seront disponibles prochainement")}
            </p>
          </div>
        ) : (
          formation.modules.map((mod, mi) => {
            const allModLessons = mod.sections.flatMap((s) => s.lessons);
            const modCompleted = allModLessons.filter((l) => isLessonWatchable(l) && completed.has(l.id)).length;
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
                  borderBottom: "1px solid rgba(var(--ep-accent-rgb),0.08)",
                }}>
                  <div>
                    <p style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: "0.18em",
                      textTransform: "uppercase", color: "rgba(var(--ep-accent-rgb),0.55)",
                      margin: "0 0 2px",
                    }}>
                      {t("Section")}{" "}{mi + 1}
                    </p>
                    <h3 style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ep-ink)", margin: 0 }}>
                      {mod.title}
                    </h3>
                  </div>
                  {modPublished > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.3)",
                      background: "rgba(var(--ep-hi-rgb),0.04)",
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
                      <p style={{ fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.2)", margin: 0, fontStyle: "italic" }}>
                        {t("Vidéos bientôt disponibles")}
                      </p>
                    </div>
                  )}
                  {mod.sections.map((sec, si) => {
                    const secPublished = sec.lessons.filter((l) => l.is_published && l.youtube_id);
                    if (secPublished.length === 0 && sec.lessons.length > 0) {
                      return (
                        <div key={sec.id} style={{ padding: "10px 18px", borderTop: si > 0 ? "1px solid rgba(var(--ep-accent-rgb),0.05)" : "none" }}>
                          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(var(--ep-accent-rgb),0.35)", margin: "0 0 6px" }}>
                            {sec.title}
                          </p>
                          <p style={{ fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.2)", margin: 0, fontStyle: "italic" }}>
                            {t("Bientôt disponible")}
                          </p>
                        </div>
                      );
                    }
                    if (secPublished.length === 0) return null;

                    return (
                      <div key={sec.id} style={{ borderTop: si > 0 ? "1px solid rgba(var(--ep-accent-rgb),0.06)" : "none" }}>
                        {/* Section label */}
                        <div style={{ padding: "10px 18px 4px" }}>
                          <p style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
                            textTransform: "uppercase", color: "rgba(var(--ep-accent-rgb),0.4)",
                            margin: 0,
                          }}>
                            {sec.title}
                          </p>
                        </div>

                        {/* Lessons */}
                        {sec.lessons.map((lesson, li) => {
                          const isPublished = !!(lesson.is_published && lesson.youtube_id);
                          const isAvailable = isPublished && !locked;
                          const isPremiumLocked = isPublished && locked;
                          const isDone = completed.has(lesson.id);

                          return (
                            <div key={lesson.id}>
                              {li > 0 && (
                                <div style={{ height: 1, background: "rgba(var(--ep-accent-rgb),0.04)", margin: "0 18px" }} />
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
                                    background: isDone ? "rgba(var(--ep-ok-rgb),0.1)" : "rgba(var(--ep-accent-rgb),0.08)",
                                    border: `1px solid ${isDone ? "rgba(var(--ep-ok-rgb),0.3)" : "rgba(var(--ep-accent-rgb),0.15)"}`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0,
                                  }}>
                                    {isDone
                                      ? <CheckCircle2 size={12} style={{ color: "var(--ep-ok)" }} />
                                      : <PlayCircle size={12} style={{ color: "var(--ep-accent)" }} strokeWidth={1.8} />
                                    }
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{
                                      fontSize: 12, fontWeight: isDone ? 600 : 700,
                                      color: isDone ? "rgba(var(--ep-ink-rgb),0.45)" : "var(--ep-ink)",
                                      margin: 0, lineHeight: 1.3,
                                      textDecoration: isDone ? "line-through" : "none",
                                      textDecorationColor: "rgba(var(--ep-ink-rgb),0.2)",
                                    }}>
                                      {lesson.title}
                                    </p>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                    <span style={{ fontSize: 10, color: "rgba(var(--ep-ink-rgb),0.2)", fontWeight: 600 }}>
                                      {lesson.duration_min}{t("min")}
                                    </span>
                                    <ChevronRight size={13} style={{ color: "rgba(var(--ep-ink-rgb),0.2)" }} />
                                  </div>
                                </Link>
                              ) : (
                                <div style={{
                                  display: "flex", alignItems: "center", gap: 12,
                                  padding: "11px 18px", opacity: isPremiumLocked ? 0.7 : 0.4,
                                }}>
                                  <div style={{
                                    width: 26, height: 26, borderRadius: "50%",
                                    background: isPremiumLocked ? "rgba(var(--ep-accent-rgb),0.08)" : "rgba(var(--ep-hi-rgb),0.03)",
                                    border: isPremiumLocked ? "1px solid rgba(var(--ep-accent-rgb),0.2)" : "1px solid rgba(var(--ep-hi-rgb),0.08)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0,
                                  }}>
                                    {isPremiumLocked
                                      ? <Crown size={10} style={{ color: "var(--ep-accent)" }} />
                                      : <Lock size={10} style={{ color: "rgba(var(--ep-ink-rgb),0.3)" }} />
                                    }
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: 12, color: isPremiumLocked ? "rgba(var(--ep-ink-rgb),0.55)" : "rgba(var(--ep-ink-rgb),0.4)", margin: 0 }}>
                                      {lesson.title}
                                    </p>
                                    {isPremiumLocked && (
                                      <p style={{ fontSize: 9.5, color: "rgba(var(--ep-accent-rgb),0.6)", margin: "2px 0 0", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                        {t("Réservé aux clients coachés")}
                                      </p>
                                    )}
                                  </div>
                                  <span style={{ fontSize: 10, color: "rgba(var(--ep-ink-rgb),0.2)" }}>
                                    {lesson.duration_min}{t("min")}
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
