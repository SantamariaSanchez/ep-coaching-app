import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { getFormations, getFormationWithModules, countLessons } from "@/utils/formations";
import { BookOpen, ChevronRight, PlayCircle, Eye, EyeOff } from "lucide-react";
import NewFormationButton from "./NewFormationButton";

export const dynamic = "force-dynamic";

export default async function CoachFormationsPage() {
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const formations = await getFormations();

  const formationData = await Promise.all(
    formations.map(async (f) => {
      const withModules = await getFormationWithModules(f.id);
      const counts = withModules ? countLessons(withModules.modules) : { total: 0, published: 0, totalMin: 0 };
      // Vidéo renseignée mais pas encore publiée — du contenu prêt qui reste
      // invisible pour les clients, souvent juste oublié.
      const readyNotPublished = withModules
        ? withModules.modules.flatMap((m) => m.sections.flatMap((s) => s.lessons)).filter((l) => l.youtube_id && !l.is_published).length
        : 0;
      return { formation: f, ...counts, moduleCount: withModules?.modules.length ?? 0, readyNotPublished };
    })
  );

  const totalReadyNotPublished = formationData.reduce((s, d) => s + d.readyNotPublished, 0);
  const totalPublished = formationData.reduce((s, d) => s + d.published, 0);

  return (
    <div
      className="page-transition"
      style={{ padding: "32px 20px 48px", maxWidth: 700, margin: "0 auto" }}
    >
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Gestion</p>
        <h1 style={{
          fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em",
          color: "#F5EDED", margin: 0,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <BookOpen size={26} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
          Formations
        </h1>
        <p style={{ marginTop: 6, fontSize: 12, color: "rgba(245,237,237,0.3)" }}>
          {formations.length} formation{formations.length !== 1 ? "s" : ""} · Clique pour gérer le contenu
        </p>
      </div>

      {totalReadyNotPublished > 0 && (
        <div
          className="ep-card animate-fade-up"
          style={{
            padding: "14px 18px",
            marginBottom: 16,
            background: "linear-gradient(135deg, rgba(224,30,30,0.1) 0%, rgba(137,4,4,0.04) 100%)",
            border: "1px solid rgba(224,30,30,0.25)",
          }}
        >
          <p style={{ fontSize: 12.5, fontWeight: 800, color: "#F5EDED", margin: "0 0 3px" }}>
            {totalReadyNotPublished} vidéo{totalReadyNotPublished !== 1 ? "s" : ""} prête{totalReadyNotPublished !== 1 ? "s" : ""} mais pas encore publiée{totalReadyNotPublished !== 1 ? "s" : ""}
          </p>
          <p style={{ fontSize: 11, color: "rgba(245,237,237,0.4)", margin: 0, lineHeight: 1.5 }}>
            {totalPublished === 0
              ? "Aucune vidéo n'est visible côté client pour l'instant, même si l'URL YouTube est déjà renseignée. Publie-les (dans chaque leçon) pour que ce contenu serve enfin."
              : "Une URL YouTube renseignée sur une leçon ne suffit pas à la rendre visible — pense à la publier."}
          </p>
        </div>
      )}

      <NewFormationButton />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {formationData.map(({ formation, total, published, moduleCount }, i) => (
          <Link
            key={formation.id}
            href={`/dashboard/coach/formations/${formation.id}`}
            className="ep-card animate-fade-up"
            style={{
              animationDelay: `${i * 50}ms`,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "16px 20px",
              textDecoration: "none",
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 13,
              background: "rgba(224,30,30,0.10)",
              border: "1px solid rgba(224,30,30,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, flexShrink: 0,
            }}>
              {formation.emoji}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", color: "#F5EDED", margin: 0 }}>
                  {formation.title}
                </h3>
                {formation.is_published
                  ? <Eye size={12} style={{ color: "#4ade80" }} />
                  : <EyeOff size={12} style={{ color: "rgba(245,237,237,0.2)" }} />
                }
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ fontSize: 10, color: "rgba(245,237,237,0.3)", fontWeight: 600 }}>
                  {moduleCount} section{moduleCount !== 1 ? "s" : ""}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "rgba(245,237,237,0.3)", fontWeight: 600 }}>
                  <PlayCircle size={9} />
                  {published}/{total} vidéos publiées
                </span>
              </div>
            </div>

            <ChevronRight size={16} style={{ color: "rgba(245,237,237,0.2)", flexShrink: 0 }} />
          </Link>
        ))}

        {formations.length === 0 && (
          <div className="ep-card" style={{ padding: "40px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "rgba(245,237,237,0.35)", margin: 0 }}>
              Aucune formation pour l&apos;instant. Clique sur &quot;Nouvelle formation&quot; pour en créer une.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
