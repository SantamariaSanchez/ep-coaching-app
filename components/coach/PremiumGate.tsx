import Link from "next/link";
import { Lock, Check } from "lucide-react";
import { getUser } from "@/utils/auth";
import { getCoachTier } from "@/lib/coach-tier";
import { getT } from "@/lib/i18n-server";
import { COACH_PLATFORM_PLANS } from "@/lib/coach-platform-plan";

// Verrou des rubriques Premium (voir lib/coach-tier.ts) : posé par le
// layout de chaque rubrique, il laisse passer Premium, le fondateur et les
// coachs en accès gratuit, et montre à un coach Standard ce qu'il débloque.
const FEATURES: Record<string, { title: string; detail: string }> = {
  contenu: { title: "Création de contenu", detail: "Studio créatif, scripts et prompteur, stats réseaux, niche et avatar, pilotage business et mailing." },
  formations: { title: "Les 5 formations EP", detail: "Bodybuilding, nutrition, entraînement, business et psychologie, à suivre à ton rythme." },
  lives: { title: "Les lives", detail: "Coaching live, ateliers et questions-réponses en direct." },
  ia: { title: "L'IA", detail: "Ton assistant qui relance tes clients chaque jour, et Claude relié à ton appli et à Notion." },
};

export default async function PremiumGate({ feature, children }: { feature: keyof typeof FEATURES; children: React.ReactNode }) {
  const user = await getUser();
  if (!user || (await getCoachTier(user.id)) === "premium") return <>{children}</>;

  const t = await getT();
  const premium = COACH_PLATFORM_PLANS.find((p) => p.id === "premium")!;
  const current = FEATURES[feature];
  const others = Object.entries(FEATURES).filter(([k]) => k !== feature);

  return (
    <div className="px-6 py-10 max-w-xl mx-auto pb-24 md:pb-10 page-transition">
      <div className="ep-card" style={{ padding: 24 }}>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-(--ep-accent)">
          <Lock size={12} /> {t("Réservé à Premium")}
        </span>
        <h1 className="mt-2 text-2xl font-black text-(--ep-strong)">{t(current.title)}</h1>
        <p className="mt-1.5 text-sm text-(--ep-ink)/60 leading-relaxed">{t(current.detail)}</p>

        <p className="mt-5 mb-2 text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/40">{t("Premium débloque aussi")}</p>
        <ul className="space-y-2">
          {others.map(([k, f]) => (
            <li key={k} className="flex gap-2.5 text-[13px] text-(--ep-ink)/75">
              <Check size={15} className="text-(--ep-ok) flex-shrink-0 mt-0.5" />
              <span>
                <b className="text-(--ep-strong)">{t(f.title)}</b> · {t(f.detail)}
              </span>
            </li>
          ))}
        </ul>

        <a
          href={`${premium.url}?client_reference_id=${encodeURIComponent(user.id)}`}
          className="ep-btn-primary mt-6 w-full inline-flex items-center justify-center"
          style={{ height: 50 }}
        >
          {t("Passer à Premium")} · {premium.priceLabel}
        </a>
        <p className="mt-3 text-center text-[11.5px] text-(--ep-ink)/45">
          {t("Ta formule Standard est remplacée, sans engagement.")}{" "}
          <Link href="/dashboard/coach" className="underline">{t("Retour à mes clients")}</Link>
        </p>
      </div>
    </div>
  );
}
