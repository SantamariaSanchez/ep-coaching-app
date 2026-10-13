import Link from "next/link";
import { Check, ChevronRight, ClipboardList, Dumbbell, Map, Salad, CalendarCheck } from "lucide-react";
import { getT } from "@/lib/i18n-server";

// Mise en route d'un client (2026-10-13, retour direct : « un coach doit
// l'utiliser avec zéro friction, ça lui fait gagner du temps »). Au lieu de
// chercher onglet par onglet ce qui manque, la fiche dit en une ligne ce qui
// reste à faire pour que le client soit lancé, chaque point à un tap. La
// carte disparaît dès que tout est prêt : zéro bruit sur un client lancé.

const DAYS = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

export default async function ClientSetupCard({
  clientId,
  firstName,
  hasIntake,
  hasProgram,
  hasDiet,
  hasRoadmap,
  checkinDay,
}: {
  clientId: string;
  firstName: string;
  hasIntake: boolean;
  hasProgram: boolean;
  hasDiet: boolean;
  hasRoadmap: boolean;
  checkinDay: number | null;
}) {
  const t = await getT();
  const base = `/dashboard/coach/clients/${clientId}`;
  const steps = [
    { done: hasIntake, icon: ClipboardList, todo: t("Onboarding pas encore rempli"), doneLabel: t("Onboarding rempli"), href: `${base}?tab=intake`, cta: t("Voir") },
    { done: hasProgram, icon: Dumbbell, todo: t("Créer son programme"), doneLabel: t("Programme livré"), href: `${base}/program/edit`, cta: t("Créer") },
    { done: hasDiet, icon: Salad, todo: t("Créer sa diète"), doneLabel: t("Diète active"), href: `${base}/nutrition`, cta: t("Créer") },
    { done: hasRoadmap, icon: Map, todo: t("Faire sa road map (1 min)"), doneLabel: t("Road map prête"), href: `${base}/roadmap`, cta: t("Faire") },
    {
      done: !!checkinDay,
      icon: CalendarCheck,
      todo: t("Choisir son jour de check-in"),
      doneLabel: checkinDay ? t("Check-in le {day}", { day: t(DAYS[checkinDay] ?? "") }) : "",
      href: `${base}?tab=checkins`,
      cta: t("Choisir"),
    },
  ];
  const left = steps.filter((s) => !s.done).length;
  if (left === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-(--ep-accent)/30 bg-(--ep-accent)/[0.06] p-4">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <p className="text-[11px] font-black uppercase tracking-widest text-(--ep-accent)">{t("Mise en route de {name}", { name: firstName })}</p>
        <p className="text-[11px] font-semibold text-(--ep-ink)/50">
          {steps.length - left}/{steps.length} {t("prêt")}
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <li key={s.href}>
              {s.done ? (
                <div className="flex min-h-[44px] items-center gap-2 rounded-xl border border-(--ep-line)/20 px-3 py-2 text-[12px] text-(--ep-ink)/45">
                  <Check size={14} className="shrink-0 text-(--ep-ok)" />
                  <span className="truncate">{s.doneLabel}</span>
                </div>
              ) : (
                <Link
                  href={s.href}
                  className="flex min-h-[44px] items-center gap-2 rounded-xl border border-(--ep-accent)/35 bg-(--ep-s2) px-3 py-2 text-[12.5px] font-bold text-(--ep-strong) transition-colors hover:border-(--ep-accent) active:scale-[0.99]"
                >
                  <Icon size={15} className="shrink-0 text-(--ep-accent)" />
                  <span className="flex-1 leading-tight">{s.todo}</span>
                  <span className="inline-flex items-center text-[10.5px] font-black uppercase tracking-widest text-(--ep-accent)">
                    {s.cta}
                    <ChevronRight size={13} />
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
