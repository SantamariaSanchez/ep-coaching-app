import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock, ArrowRight } from "lucide-react";
import { getT } from "@/lib/i18n-server";
import { LEARN_BY_SLUG, LEARN_GUIDES } from "@/lib/learn";
import { INTENT_BY_ID } from "@/lib/intents";

// Rendu commun des guides « Comprendre » (client et espace Moi du coach).

export async function LearnIndex({ space }: { space: "coach" | "client" }) {
  const t = await getT();
  const base = space === "coach" ? "/dashboard/coach/moi/comprendre" : "/dashboard/client/comprendre";
  return (
    <div className="px-4 sm:px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">{t("Comprendre")}</p>
      <h1 className="text-3xl font-black uppercase tracking-tight mb-2">{t("Comment ça marche")}</h1>
      <p style={{ fontSize: 13.5, color: "rgba(245,237,237,0.6)", margin: "0 0 18px", lineHeight: 1.6 }}>
        {t("L'essentiel en quelques minutes, sans jargon, avec ce que tu fais concrètement dans l'appli.")}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {LEARN_GUIDES.map((g) => (
          <Link key={g.slug} href={`${base}/${g.slug}`} className="ep-card ep-press" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", textDecoration: "none", color: "#F5EDED" }}>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{t(g.title)}</span>
              <span style={{ display: "block", fontSize: 12, color: "rgba(245,237,237,0.55)", marginTop: 3, lineHeight: 1.45 }}>{t(g.intro)}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(245,237,237,0.4)", marginTop: 6 }}>
                <Clock size={11} /> {g.minutes}{" "}{t("min")}
              </span>
            </span>
            <ChevronRight size={16} style={{ color: "rgba(245,237,237,0.3)" }} />
          </Link>
        ))}
      </div>
    </div>
  );
}

export async function LearnGuidePage({ slug, space }: { slug: string; space: "coach" | "client" }) {
  const guide = LEARN_BY_SLUG[slug];
  if (!guide) notFound();
  const t = await getT();
  const base = space === "coach" ? "/dashboard/coach/moi/comprendre" : "/dashboard/client/comprendre";
  return (
    <div className="px-4 sm:px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <Link href={base} style={{ fontSize: 12, color: "rgba(245,237,237,0.5)", textDecoration: "none" }}>← {t("Tous les guides")}</Link>
      <h1 className="text-3xl font-black uppercase tracking-tight mt-3 mb-2">{t(guide.title)}</h1>
      <p style={{ fontSize: 14, color: "rgba(245,237,237,0.7)", margin: "0 0 20px", lineHeight: 1.65 }}>{t(guide.intro)}</p>
      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {guide.steps.map((s, i) => {
          const intent = s.action ? INTENT_BY_ID[s.action.intent] : null;
          const href = intent?.href[space] ?? null;
          return (
            <li key={s.title} className="ep-card" style={{ padding: "16px 16px" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: 99, background: "rgba(224,30,30,0.16)", color: "#ff6b6b", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#F5EDED", lineHeight: 1.35 }}>{t(s.title)}</h2>
                  <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "rgba(245,237,237,0.72)", lineHeight: 1.65 }}>{t(s.body)}</p>
                  {s.action && href && (
                    <Link href={href} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(224,30,30,0.12)", border: "1px solid rgba(224,30,30,0.35)", color: "#ff6b6b", fontSize: 12.5, fontWeight: 800, textDecoration: "none" }}>
                      {t(s.action.label)} <ArrowRight size={13} />
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
