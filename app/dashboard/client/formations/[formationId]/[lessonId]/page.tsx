import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { getLesson, getFormationWithModules, getUserProgress } from "@/utils/formations";
import VideoPlayer, { VideoComingSoon } from "@/components/formations/VideoPlayer";
import { ChevronLeft, ChevronRight, ListVideo } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ formationId: string; lessonId: string }>;
}) {
  const { formationId, lessonId } = await params;

  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");
  if (profile?.subscription_status !== "active") redirect("/dashboard/client/abonnement");

  const [lesson, formation, completed] = await Promise.all([
    getLesson(lessonId),
    getFormationWithModules(formationId),
    getUserProgress(user.id),
  ]);

  if (!lesson || !formation) notFound();

  // Flatten all lessons across modules → sections. Précédent/Suivant ne
  // doit sauter que vers des leçons réellement accessibles — même règle
  // que la page de présentation (sinon on atterrit sur une leçon verrouillée
  // que l'utilisateur ne peut normalement même pas cliquer depuis la liste).
  const allLessons = formation.modules
    .flatMap((m) => m.sections.flatMap((s) => s.lessons))
    .filter((l) => l.is_published && l.youtube_id);
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // Find current module and section
  const currentModule = formation.modules.find((m) =>
    m.sections.some((s) => s.lessons.some((l) => l.id === lessonId))
  );
  const currentSection = currentModule?.sections.find((s) =>
    s.lessons.some((l) => l.id === lessonId)
  ) ?? null;

  const isCompleted = completed.has(lessonId);

  return (
    <div
      className="page-transition"
      style={{ padding: "20px 20px 100px", maxWidth: 720, margin: "0 auto" }}
    >
      {/* Back to formation */}
      <Link
        href={`/dashboard/client/formations/${formationId}`}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: "rgba(245,237,237,0.3)", textDecoration: "none",
          fontSize: 11, fontWeight: 600, marginBottom: 20, letterSpacing: "0.05em",
        }}
        className="animate-fade-in"
      >
        <ChevronLeft size={13} /> {formation.title}
      </Link>

      {/* Breadcrumb: Module › Section */}
      {currentModule && (
        <div className="animate-fade-in" style={{ marginBottom: 10 }}>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "rgba(224,30,30,0.55)",
            margin: 0,
          }}>
            {currentModule.title}
            {currentSection && (
              <span style={{ color: "rgba(245,237,237,0.25)", fontWeight: 500, textTransform: "none", letterSpacing: "0.04em" }}>
                {" › "}{currentSection.title}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Video player or placeholder */}
      <div className="animate-scale-in" style={{ marginBottom: 24 }}>
        {lesson.youtube_id && lesson.is_published ? (
          <VideoPlayer
            youtubeId={lesson.youtube_id}
            title={lesson.title}
            lessonId={lessonId}
            isCompleted={isCompleted}
            description={lesson.description}
            durationMin={lesson.duration_min}
          />
        ) : (
          <VideoComingSoon title={lesson.title} durationMin={lesson.duration_min} />
        )}
      </div>

      {/* Prev / Next navigation */}
      <div
        className="animate-fade-up"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}
      >
        {prevLesson ? (
          <Link
            href={`/dashboard/client/formations/${formationId}/${prevLesson.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 14px",
              background: "rgba(16,1,1,0.60)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(224,30,30,0.12)",
              borderRadius: "var(--radius-lg)",
              textDecoration: "none",
            }}
          >
            <ChevronLeft size={15} style={{ color: "rgba(245,237,237,0.3)", flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.25)", margin: "0 0 2px" }}>
                Précédent
              </p>
              <p style={{
                fontSize: 11, fontWeight: 700, color: "rgba(245,237,237,0.65)", margin: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {prevLesson.title}
              </p>
            </div>
          </Link>
        ) : <div />}

        {nextLesson ? (
          <Link
            href={`/dashboard/client/formations/${formationId}/${nextLesson.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
              padding: "12px 14px",
              background: "rgba(16,1,1,0.60)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(224,30,30,0.12)",
              borderRadius: "var(--radius-lg)",
              textDecoration: "none",
              textAlign: "right",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.25)", margin: "0 0 2px" }}>
                Suivant
              </p>
              <p style={{
                fontSize: 11, fontWeight: 700, color: "rgba(245,237,237,0.65)", margin: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {nextLesson.title}
              </p>
            </div>
            <ChevronRight size={15} style={{ color: "rgba(245,237,237,0.3)", flexShrink: 0 }} />
          </Link>
        ) : (
          <Link
            href={`/dashboard/client/formations/${formationId}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
              padding: "12px 14px",
              background: "rgba(74,222,128,0.06)",
              border: "1px solid rgba(74,222,128,0.18)",
              borderRadius: "var(--radius-lg)",
              textDecoration: "none",
              textAlign: "right",
            }}
          >
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(74,222,128,0.5)", margin: "0 0 2px" }}>
                Formation terminée
              </p>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(74,222,128,0.8)", margin: 0 }}>
                Voir le résumé
              </p>
            </div>
            <ListVideo size={15} style={{ color: "rgba(74,222,128,0.5)", flexShrink: 0 }} />
          </Link>
        )}
      </div>

      {/* Lesson list in current section */}
      {currentSection && currentSection.lessons.length > 1 && (
        <div className="ep-card animate-fade-up" style={{ overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(224,30,30,0.08)" }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(224,30,30,0.4)", margin: "0 0 1px" }}>
              {currentModule?.title}
            </p>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(245,237,237,0.6)", margin: 0 }}>
              {currentSection.title}
            </p>
          </div>
          {currentSection.lessons.map((l, i) => {
            const isCurrent = l.id === lessonId;
            const isDone = completed.has(l.id);
            const isAvail = !!(l.is_published && l.youtube_id);

            return (
              <div key={l.id}>
                {i > 0 && <div style={{ height: 1, background: "rgba(224,30,30,0.05)", margin: "0 16px" }} />}
                {isAvail ? (
                  <Link
                    href={`/dashboard/client/formations/${formationId}/${l.id}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "11px 16px", textDecoration: "none",
                      background: isCurrent ? "rgba(224,30,30,0.06)" : "transparent",
                      borderLeft: isCurrent ? "2px solid #E01E1E" : "2px solid transparent",
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(245,237,237,0.2)", width: 18, flexShrink: 0, textAlign: "right" }}>
                      {i + 1}
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? "#F5EDED" : isDone ? "rgba(245,237,237,0.4)" : "rgba(245,237,237,0.65)",
                      flex: 1, lineHeight: 1.3,
                    }}>
                      {l.title}
                    </span>
                    {isCurrent && (
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#E01E1E", flexShrink: 0 }} />
                    )}
                  </Link>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", opacity: 0.35 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(245,237,237,0.2)", width: 18, textAlign: "right" }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 12, color: "rgba(245,237,237,0.4)", flex: 1 }}>{l.title}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
