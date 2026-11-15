import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n-server";
import BackButton from "@/components/ui/BackButton";
import { getUser, getProfile } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { summarizeFeedback, MOST_USEFUL_CHOICES, type FeedbackRow } from "@/lib/app-feedback";

// Avis des membres sur l'appli (C78), réservé au propriétaire de la
// plateforme. Lecture sous RLS (policy « Own or owner feedback read »).
// Aucune identité affichée : on lit ce qui sert et ce qui bloque, pas qui.
export default async function FeedbackPage() {
  const t = await getT();
  const user = await getUser();
  if (!user) redirect("/");
  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) redirect("/dashboard/coach");

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("app_feedback")
    .select("usefulness, most_useful, missing, access_type, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  const rows = (data ?? []) as FeedbackRow[];
  const summary = summarizeFeedback(rows);
  const label = new Map<string, string>(MOST_USEFUL_CHOICES.map((c) => [c.id, c.label]));
  const comments = rows.filter((r) => r.missing);
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <BackButton fallbackHref="/dashboard/coach/admin" label={t("Retour")} className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-(--ep-ink)/40 mb-6" />
      <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 mb-1">{t("Administration")}</p>
      <h1 className="text-3xl font-black uppercase tracking-tight mb-2">{t("Avis des membres")}</h1>
      <p className="text-[12.5px] text-(--ep-ink)/55 mb-5 leading-relaxed">
        {t("Avis volontaires laissés depuis l'accueil (3 questions, au plus tous les 60 jours). Peu de réponses = tendance, pas une preuve.")}
      </p>

      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { k: t("Réponses"), v: String(summary.count) },
          { k: t("Utilité moyenne"), v: summary.average != null ? `${String(summary.average).replace(".", ",")} / 5` : "·" },
          { k: t("Notes 1 ou 2"), v: summary.count ? `${summary.lowShare} %` : "·" },
        ].map((x) => (
          <div key={x.k} className="ep-card" style={{ padding: "12px 10px", textAlign: "center" }}>
            <p className="text-xl font-black">{x.v}</p>
            <p className="text-[9.5px] font-bold uppercase tracking-widest text-(--ep-ink)/40">{x.k}</p>
          </div>
        ))}
      </div>

      {summary.mostUseful.length > 0 && (
        <section className="ep-card mb-5" style={{ padding: "14px 16px" }}>
          <p className="text-[13px] font-black mb-2">{t("Ce qui sert le plus")}</p>
          <ul className="flex flex-col gap-1.5">
            {summary.mostUseful.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-[12.5px]">
                <span className="flex-1">{t(m.label)}</span>
                <span className="font-black">{m.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <p className="text-[13px] font-black mb-2">{t("Ce qui manque ou bloque")} ({comments.length})</p>
        {comments.length === 0 && <p className="text-[12.5px] text-(--ep-ink)/45">{t("Aucun commentaire pour l'instant.")}</p>}
        <ul className="flex flex-col gap-2">
          {comments.map((r, i) => (
            <li key={i} className="ep-card" style={{ padding: "10px 12px" }}>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{r.missing}</p>
              <p className="text-[10.5px] text-(--ep-ink)/40 mt-1">
                {fmt.format(new Date(r.created_at))} · {r.usefulness}/5{r.most_useful ? ` · ${t(label.get(r.most_useful) ?? r.most_useful)}` : ""}{r.access_type ? ` · ${r.access_type}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
