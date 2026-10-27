"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, X } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { WEEKDAY_LONG, WEEKDAY_SHORT } from "@/lib/program-week";
import { moveProgramDay } from "@/app/actions/program-moves";

export interface MovableDay {
  id: string;
  label: string;
  weekday: number | null;
}

// « Décaler » : changer le jour d'une séance sans quitter la page. Un petit
// lien discret ouvre une feuille avec les 7 jours (l'occupant de chaque jour
// est indiqué), le choix « juste cette semaine » (par défaut, sans risque)
// ou « chaque semaine », et l'échange automatique si le jour est pris.
export default function MoveSession({
  dayId,
  days,
  todayDow,
  variant = "link",
}: {
  dayId: string;
  /** Toutes les séances du programme avec leur jour effectif (cette semaine). */
  days: MovableDay[];
  /** Jour ISO d'aujourd'hui (1 = lundi) : les jours passés ne sont pas proposés « cette semaine ». */
  todayDow: number;
  variant?: "link" | "chip";
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"week" | "always">("week");
  const [target, setTarget] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const me = days.find((d) => d.id === dayId);
  if (!me) return null;
  const occupantOf = (wd: number) => days.find((d) => d.id !== dayId && d.weekday === wd) ?? null;
  const occupant = target ? occupantOf(target) : null;

  function close() {
    setOpen(false);
    setTarget(null);
    setError(null);
  }

  function confirm() {
    if (!target) return;
    setError(null);
    start(async () => {
      const res = await moveProgramDay({ dayId, weekday: target, scope, swap: true });
      if (res.error) {
        setError(res.error);
        return;
      }
      close();
      router.refresh();
    });
  }

  const trigger =
    variant === "chip" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl border border-(--ep-line)/30 bg-(--ep-ink)/[0.05] text-[11px] font-black uppercase tracking-wider text-(--ep-ink)/75"
      >
        <CalendarClock size={13} aria-hidden />
        {t("Décaler")}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 min-h-11 -my-2 text-[12px] font-bold text-(--ep-ink)/60"
      >
        <CalendarClock size={13} aria-hidden />
        {t("Décaler")}
      </button>
    );

  return (
    <>
      {trigger}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={`${t("Décaler")} ${me.label}`}>
          <button type="button" aria-label={t("Fermer")} onClick={close} className="absolute inset-0 bg-(--ep-bg)/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-(--ep-line)/30 bg-(--ep-s1) p-4 pb-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-(--ep-accent)">{t("Décaler la séance")}</p>
                <h3 className="text-lg font-black uppercase tracking-tight text-(--ep-strong) truncate">{me.label}</h3>
                <p className="text-[12px] text-(--ep-ink)/55">
                  {me.weekday ? `${t("Prévue")} ${t(WEEKDAY_LONG[me.weekday]).toLowerCase()}` : t("Pas de jour fixe")}
                </p>
              </div>
              <button type="button" onClick={close} aria-label={t("Fermer")} className="min-h-11 min-w-11 flex items-center justify-center text-(--ep-ink)/50">
                <X size={18} />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5" role="group" aria-label={t("Quand")}>
              {(
                [
                  ["week", t("Juste cette semaine")],
                  ["always", t("Chaque semaine")],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setScope(key);
                    setTarget(null);
                    setError(null);
                  }}
                  aria-pressed={scope === key}
                  className={`min-h-11 rounded-xl border text-[12px] font-black ${
                    scope === key ? "border-(--ep-accent)/60 bg-(--ep-accent)/15 text-(--ep-accent)" : "border-(--ep-line)/25 text-(--ep-ink)/55"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-(--ep-ink)/50">
              {scope === "week" ? t("Seule cette semaine change, ton programme habituel reste le même.") : t("Ton programme habituel change, toutes les semaines.")}
            </p>

            <div className="mt-3 grid grid-cols-7 gap-1" role="group" aria-label={t("Nouveau jour")}>
              {[1, 2, 3, 4, 5, 6, 7].map((wd) => {
                const occ = occupantOf(wd);
                const current = me.weekday === wd;
                const past = scope === "week" && wd < todayDow;
                const selected = target === wd;
                return (
                  <button
                    key={wd}
                    type="button"
                    disabled={current || past}
                    onClick={() => {
                      setTarget(wd);
                      setError(null);
                    }}
                    aria-pressed={selected}
                    aria-label={`${t(WEEKDAY_LONG[wd])}${occ ? `, ${occ.label}` : ""}`}
                    className={`flex flex-col items-center justify-start gap-0.5 rounded-xl border px-0.5 py-2 min-h-16 ${
                      selected
                        ? "border-(--ep-accent) bg-(--ep-accent)/20 text-(--ep-strong)"
                        : current
                          ? "border-(--ep-accent)/40 bg-(--ep-accent)/10 text-(--ep-accent)"
                          : "border-(--ep-line)/25 text-(--ep-ink)/80"
                    } ${past ? "opacity-30" : ""}`}
                  >
                    <span className="text-[11px] font-black uppercase">{t(WEEKDAY_SHORT[wd])}</span>
                    <span className="w-full truncate text-center text-[9px] font-bold leading-tight text-(--ep-ink)/55">
                      {current ? t("Ici") : occ ? occ.label : " "}
                    </span>
                  </button>
                );
              })}
            </div>

            {target && (
              <p className="mt-3 rounded-lg bg-(--ep-ink)/[0.05] px-3 py-2 text-[12px] leading-snug text-(--ep-ink)/80">
                {occupant
                  ? `${t("Échange")} : ${me.label} ${t("passe")} ${t(WEEKDAY_LONG[target]).toLowerCase()}, ${occupant.label} ${t("passe")} ${
                      me.weekday ? t(WEEKDAY_LONG[me.weekday]).toLowerCase() : t("sans jour fixe")
                    }.`
                  : `${me.label} ${t("passe")} ${t(WEEKDAY_LONG[target]).toLowerCase()}.`}{" "}
                {t("Ton agenda suit.")}
              </p>
            )}
            {error && <p className="mt-2 text-[12px] font-bold text-(--ep-bad)">{t(error)}</p>}

            <button
              type="button"
              onClick={confirm}
              disabled={!target || pending}
              className="mt-3 w-full min-h-12 flex items-center justify-center gap-2 rounded-xl bg-(--ep-accent) text-(--ep-strong) text-[12px] font-black uppercase tracking-wider disabled:opacity-40"
            >
              <Check size={15} aria-hidden />
              {pending ? t("Un instant") : occupant ? t("Échanger") : t("Décaler")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
