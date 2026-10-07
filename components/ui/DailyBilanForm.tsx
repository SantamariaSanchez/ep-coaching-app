"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import type { DailyLog } from "@/utils/daily-logs";
import { isOn, type AppSetup } from "@/lib/app-setup";
import { Check, Scale, Dumbbell, Moon, Apple, Footprints, BedDouble, Pencil, Sun, MoonStar } from "lucide-react";

export type BilanAction = (
  prev: { error?: string; success?: boolean } | null,
  formData: FormData
) => Promise<{ error?: string; success?: boolean }>;

const inp =
  "w-full bg-[rgba(0,0,0,0.4)] border border-[rgba(137,4,4,0.3)] rounded-lg px-3 py-2.5 text-sm text-[#F5EDED] placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";
const lbl = "block text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5";
const hint = "text-[10.5px] text-[#F5EDED]/30 mt-1.5 leading-snug";

function TriScale({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  const opts = [
    { val: "low", fr: "Bas" },
    { val: "medium", fr: "Moyen" },
    { val: "high", fr: "Haut" },
  ];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {opts.map(({ val, fr }) => (
        <label key={val} style={{ flex: 1, cursor: "pointer" }}>
          <input type="radio" name={name} value={val} defaultChecked={defaultValue === val} className="sr-only peer" />
          <span style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: 38, borderRadius: 8,
            border: "1px solid rgba(137,4,4,0.3)",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
            color: "rgba(245,237,237,0.4)",
            cursor: "pointer",
            transition: "background 0.15s, border-color 0.15s, color 0.15s",
          }}
          className="peer-checked:bg-[#E01E1E] peer-checked:border-[#E01E1E] peer-checked:text-white"
          >
            {fr}
          </span>
        </label>
      ))}
    </div>
  );
}

// Échelle de 1 à 5 (énergie, moral, courbatures), même rendu que TriScale.
function FiveScale({ name, defaultValue, low, high }: { name: string; defaultValue?: number | null; low: string; high: string }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 5 }}>
        {[1, 2, 3, 4, 5].map((v) => (
          <label key={v} style={{ flex: 1, cursor: "pointer" }}>
            <input type="radio" name={name} value={v} defaultChecked={defaultValue === v} className="sr-only peer" />
            <span
              style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 38, borderRadius: 8, border: "1px solid rgba(137,4,4,0.3)", fontSize: 13, fontWeight: 800, color: "rgba(245,237,237,0.45)", cursor: "pointer", transition: "background 0.15s, border-color 0.15s, color 0.15s" }}
              className="peer-checked:bg-[#E01E1E] peer-checked:border-[#E01E1E] peer-checked:text-white"
            >
              {v}
            </span>
          </label>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(245,237,237,0.3)", marginTop: 4 }}>
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

// Retour direct 2026-09-09 : "le sommeil faut qu'on puisse le log en
// heure... c'est juste un chiffre à virgule avec qu'un nombre" — saisir
// "7.5" au clavier numérique est pénible et pas comment on pense sa nuit
// ("7h30", pas "7 virgule 5"). Deux sélecteurs h/min plutôt qu'un champ
// décimal, convertis en décimal dans un champ caché : sleep_hours reste un
// nombre décimal en base (utils/checkins.ts, biometrics.ts...), donc zéro
// changement côté serveur, uniquement la façon de le saisir.
function hoursToParts(hours: number | null | undefined): { h: string; m: string } {
  if (hours == null) return { h: "", m: "" };
  const totalMin = Math.round(hours * 60);
  return { h: String(Math.floor(totalMin / 60)), m: String(totalMin % 60) };
}

function SleepDurationInput({ defaultValue }: { defaultValue?: number | null }) {
  const t = useT();
  const initial = hoursToParts(defaultValue);
  const [h, setH] = useState(initial.h);
  const [m, setM] = useState(initial.m);
  const decimal = h === "" && m === "" ? "" : (Number(h || 0) + Number(m || 0) / 60).toFixed(2);

  return (
    <div>
      <label className={lbl}>{t("Sommeil")}</label>
      <div style={{ display: "flex", gap: 8 }}>
        <select
          value={h}
          onChange={(e) => setH(e.target.value)}
          aria-label={t("Heures de sommeil")}
          className={inp}
          style={{ flex: 1 }}
          autoFocus
        >
          <option value="">h</option>
          {Array.from({ length: 17 }, (_, i) => i).map((v) => (
            <option key={v} value={v}>{v} h</option>
          ))}
        </select>
        <select
          value={m}
          onChange={(e) => setM(e.target.value)}
          aria-label={t("Minutes de sommeil")}
          className={inp}
          style={{ flex: 1 }}
        >
          <option value="">{t("min")}</option>
          {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((v) => (
            <option key={v} value={v}>{v}{" "}{t("min")}</option>
          ))}
        </select>
      </div>
      <input type="hidden" name="sleep_hours" value={decimal} />
    </div>
  );
}

function CardShell({
  icon: Icon,
  title,
  saved,
  children,
}: {
  icon: React.ElementType;
  title: string;
  saved: boolean;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <div className="ep-card" style={{ padding: "18px 16px", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Icon size={14} style={{ color: "#E01E1E" }} strokeWidth={2} />
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.5)", margin: 0, flex: 1 }}>
          {title}
        </p>
        {saved && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "#4ade80" }}>
            <Check size={12} />{" "}{t("Enregistré")}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function SaveButton({ pending, label = "Enregistrer" }: { pending: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        marginTop: 14,
        background: pending ? "rgba(224,30,30,0.5)" : "#E01E1E",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        padding: "10px 18px",
        fontSize: 11.5,
        fontWeight: 800,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        cursor: pending ? "wait" : "pointer",
      }}
    >
      {pending ? "..." : label}
    </button>
  );
}

// ── Poids du matin — carte autonome, en tête de page, pensée pour être
// remplie en 5 secondes au réveil sans toucher au reste du bilan. ──────────
export function WeightCard({ today, existing, action, onSaved }: { today: string; existing: DailyLog | null; action: BilanAction; onSaved?: () => void }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, null);
  const nowHour = new Date().toTimeString().slice(0, 5);

  // onSaved optionnel : plus câblé par défaut depuis la refonte 2026-08-19
  // de DailyGateOverlay.tsx (qui ne rend plus les cartes elles-mêmes, juste
  // un lien vers /dashboard/client/bilan) — gardé pour un appelant futur
  // qui voudrait réagir à une sauvegarde réussie.
  useEffect(() => {
    if (state?.success) onSaved?.();
  }, [state, onSaved]);

  return (
    <form action={formAction}>
      <input type="hidden" name="log_date" value={today} />
      <CardShell icon={Scale} title={t("Poids du matin")} saved={!!state?.success}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label className={lbl}>{t("Poids à jeun (kg)")}</label>
            <input name="weight_morning" type="number" step="0.1" min="30" max="300" defaultValue={existing?.weight_morning ?? ""} placeholder="82.5" aria-label="82.5" className={inp} autoFocus />
          </div>
          <div>
            <label className={lbl}>{t("Heure de pesée")}</label>
            <input name="weight_time" defaultValue={existing?.weight_time ?? nowHour} placeholder="07:00" aria-label="07:00" className={inp} />
          </div>
        </div>
        {state?.error && <p style={{ fontSize: 11, color: "#FDC4C4", marginTop: 8 }}>{state.error}</p>}
        <SaveButton pending={pending} label={existing?.weight_morning != null ? "Mettre à jour" : "Enregistrer le poids"} />
      </CardShell>
    </form>
  );
}

// ── Entraînement — bascule repos/entraînement d'abord, pour ne pas forcer
// une réponse "Pull, Push, Legs" absurde un jour off. Pas de note de séance
// ici : elle vit déjà dans le logbook à la fin de la séance, pas de doublon. ──
export function TrainingCard({ today, existing, action, onSaved, logbookHref = "/dashboard/client/logbook" }: { today: string; existing: DailyLog | null; action: BilanAction; onSaved?: () => void; logbookHref?: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, null);
  const [isRestDay, setIsRestDay] = useState(existing?.training_name === "Repos");

  // MASTERCLASS.md Axe E : même piège que todayLogs dans ClientNutritionView
  // — sans ça, revenir sur cette page après un bilan enregistré ailleurs
  // (coach, autre onglet) pouvait laisser affiché le mauvais bouton actif.
  useEffect(() => {
    setIsRestDay(existing?.training_name === "Repos");
  }, [existing]);

  useEffect(() => {
    if (state?.success) onSaved?.();
  }, [state, onSaved]);

  return (
    <form action={formAction}>
      <input type="hidden" name="log_date" value={today} />
      <CardShell icon={Dumbbell} title={t("Entraînement du jour")} saved={!!state?.success}>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => setIsRestDay(false)}
            style={{
              flex: 1, height: 38, borderRadius: 8, fontSize: 11.5, fontWeight: 700,
              border: `1px solid ${!isRestDay ? "#E01E1E" : "rgba(137,4,4,0.3)"}`,
              background: !isRestDay ? "#E01E1E" : "transparent",
              color: !isRestDay ? "#fff" : "rgba(245,237,237,0.5)", cursor: "pointer",
            }}
          >
            {t("Jour d'entraînement")}
          </button>
          <button
            type="button"
            onClick={() => setIsRestDay(true)}
            style={{
              flex: 1, height: 38, borderRadius: 8, fontSize: 11.5, fontWeight: 700,
              border: `1px solid ${isRestDay ? "#E01E1E" : "rgba(137,4,4,0.3)"}`,
              background: isRestDay ? "#E01E1E" : "transparent",
              color: isRestDay ? "#fff" : "rgba(245,237,237,0.5)", cursor: "pointer",
            }}
          >
            {t("Jour de repos")}
          </button>
        </div>

        {isRestDay ? (
          <>
            <input type="hidden" name="training_name" value="Repos" />
            <p style={{ fontSize: 12, color: "rgba(245,237,237,0.4)", margin: 0 }}>{t("Profite du repos. 💪")}</p>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
              <div>
                <label className={lbl}>{t("Séance")}</label>
                <input name="training_name" defaultValue={existing?.training_name === "Repos" ? "" : (existing?.training_name ?? "")} placeholder={t("Pull, Push, Legs…")} aria-label={t("Pull, Push, Legs…")} className={inp} />
              </div>
              <div style={{ width: 80 }}>
                <label className={lbl}>{t("Cardio")}</label>
                <input name="cardio" defaultValue={existing?.cardio ?? ""} placeholder="10'" aria-label="10'" className={inp} />
              </div>
            </div>
            <p className={hint}>
              {t("La note de la séance se donne à la fin de l'entraînement, directement depuis le")}{" "}
              <Link href={logbookHref} style={{ color: "#E01E1E", fontWeight: 700 }}>{t("logbook")}</Link>{t(". Pas besoin de la redonner ici.")}
            </p>
          </div>
        )}
        {state?.error && <p style={{ fontSize: 11, color: "#FDC4C4", marginTop: 8 }}>{state.error}</p>}
        <SaveButton pending={pending} />
      </CardShell>
    </form>
  );
}

// ── Sommeil — carte autonome du bilan du MATIN (avec WeightCard), séparée du
// reste du Lifestyle qui vit au bilan du SOIR. Voir MASTERCLASS.md : "il
// faut mettre le poids et le sommeil" au réveil, "le reste" le soir —
// sleep_hours/sleep_rating n'ont plus leur place noyés dans LifestyleCard.
// bedtime_actual/wake_time_actual sont optionnels (jamais bloquants), voir
// lib/daily-gate.ts pour ce qui est réellement exigé. ──────────────────────
export function SleepCard({ today, existing, action, onSaved, sleepHref = "/dashboard/client/tracking" }: { today: string; existing: DailyLog | null; action: BilanAction; onSaved?: () => void; sleepHref?: string }) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) onSaved?.();
  }, [state, onSaved]);

  return (
    <form action={formAction}>
      <input type="hidden" name="log_date" value={today} />
      <CardShell icon={BedDouble} title={t("Sommeil")} saved={!!state?.success}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <SleepDurationInput defaultValue={existing?.sleep_hours} />
            <div>
              <label className={lbl}>{t("Qualité sommeil (%)")}</label>
              <input name="sleep_rating" type="number" min="0" max="100" defaultValue={existing?.sleep_rating ?? ""} placeholder="80" aria-label="80" className={inp} />
            </div>
          </div>
          <p className={hint} style={{ marginTop: -8 }}>
            {t("Ton iPhone/montre connectée donne ces chiffres dans l'app Santé/Sommeil, sinon une estimation à l'instinct suffit.")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className={lbl}>{t("Coucher (hier soir)")}</label>
              <input name="bedtime_actual" type="time" defaultValue={existing?.bedtime_actual?.slice(0, 5) ?? ""} aria-label={t("Heure de coucher")} className={inp} />
            </div>
            <div>
              <label className={lbl}>{t("Lever (ce matin)")}</label>
              <input name="wake_time_actual" type="time" defaultValue={existing?.wake_time_actual?.slice(0, 5) ?? ""} aria-label={t("Heure de lever")} className={inp} />
            </div>
          </div>
          <p className={hint} style={{ marginTop: -8 }}>
            {t("Facultatif, sert juste à suivre ta régularité dans l'onglet")}{" "}
            <Link href={sleepHref} style={{ color: "#E01E1E", fontWeight: 700 }}>{t("Sommeil")}</Link>.
          </p>
        </div>
        {state?.error && <p style={{ fontSize: 11, color: "#FDC4C4", marginTop: 8 }}>{state.error}</p>}
        <SaveButton pending={pending} />
      </CardShell>
    </form>
  );
}

export function LifestyleCard({
  today,
  existing,
  action,
  autoSteps,
  onSaved,
  show = { pas: true, digestion: true, stress: true },
}: {
  today: string;
  existing: DailyLog | null;
  action: BilanAction;
  autoSteps?: number | null;
  onSaved?: () => void;
  show?: { pas: boolean; digestion: boolean; stress: boolean };
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) onSaved?.();
  }, [state, onSaved]);
  // Si le bilan du jour n'a pas encore son propre chiffre, on préremplit
  // avec ce que le podomètre (ou une saisie manuelle déjà faite) a déjà
  // enregistré dans Steps, plutôt que de refaire taper le même
  // chiffre une deuxième fois — même logique que nutritionTotals plus bas.
  const prefillSteps = existing?.steps ?? autoSteps ?? null;

  return (
    <form action={formAction}>
      <input type="hidden" name="log_date" value={today} />
      <CardShell icon={Moon} title={t("Lifestyle")} saved={!!state?.success}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {show.pas && (
          <div>
            <label className={lbl}>{t("Pas dans la journée")}</label>
            <input name="steps" type="number" min="0" max="100000" defaultValue={prefillSteps ?? ""} placeholder="8500" aria-label="8500" className={inp} />
            <p className={hint}>
              <Footprints size={10} style={{ display: "inline", marginRight: 3, verticalAlign: -1 }} />
              {existing?.steps == null && autoSteps != null
                ? t("Rempli automatiquement depuis Steps, modifie si besoin.")
                : t("Regarde dans l'app Santé (iPhone) ou Google Fit / Fit (Android) de ton téléphone, pas besoin d'inventer.")}
            </p>
          </div>
          )}
          {show.digestion && (
          <div>
            <label className={lbl}>{t("Digestion")}</label>
            <input name="digestion" defaultValue={existing?.digestion ?? ""} placeholder={t("OK, Ballonné, Lourd…")} aria-label={t("OK, Ballonné, Lourd…")} className={inp} />
          </div>
          )}
          {show.stress && (
          <div>
            <label className={lbl}>{t("Stress")}</label>
            <TriScale name="stress" defaultValue={existing?.stress} />
          </div>
          )}
        </div>
        {state?.error && <p style={{ fontSize: 11, color: "#FDC4C4", marginTop: 8 }}>{state.error}</p>}
        <SaveButton pending={pending} />
      </CardShell>
    </form>
  );
}

// Forme du jour (2026-09-30) : énergie, moral, hydratation, courbatures,
// FC de repos et VFC, chacun activé à part dans Mon appli.
export function FormeCard({
  today,
  existing,
  action,
  onSaved,
  show,
}: {
  today: string;
  existing: DailyLog | null;
  action: BilanAction;
  onSaved?: () => void;
  show: { energie: boolean; humeur: boolean; hydratation: boolean; courbatures: boolean; cardio_repos: boolean };
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, null);
  useEffect(() => {
    if (state?.success) onSaved?.();
  }, [state, onSaved]);
  return (
    <form action={formAction}>
      <input type="hidden" name="log_date" value={today} />
      <CardShell icon={Sun} title={t("Forme du jour")} saved={!!state?.success}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {show.energie && (
            <div>
              <label className={lbl}>{t("Énergie")}</label>
              <FiveScale name="energy" defaultValue={existing?.energy} low="À plat" high="Au top" />
            </div>
          )}
          {show.humeur && (
            <div>
              <label className={lbl}>{t("Moral")}</label>
              <FiveScale name="mood" defaultValue={existing?.mood} low="Bas" high="Excellent" />
            </div>
          )}
          {show.courbatures && (
            <div>
              <label className={lbl}>{t("Courbatures")}</label>
              <FiveScale name="soreness" defaultValue={existing?.soreness} low="Aucune" high="Très fortes" />
            </div>
          )}
          {show.hydratation && (
            <div>
              <label className={lbl}>{t("Eau bue (litres)")}</label>
              <input name="water_l" type="number" inputMode="decimal" step="0.1" min="0" max="15" defaultValue={existing?.water_l ?? ""} placeholder="2.5" aria-label={t("Eau bue en litres")} className={inp} />
            </div>
          )}
          {show.cardio_repos && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className={lbl}>{t("FC de repos (bpm)")}</label>
                <input name="resting_hr" type="number" inputMode="numeric" min="25" max="220" defaultValue={existing?.resting_hr ?? ""} placeholder="58" aria-label={t("Fréquence cardiaque de repos")} className={inp} />
              </div>
              <div>
                <label className={lbl}>{t("VFC (ms)")}</label>
                <input name="hrv" type="number" inputMode="numeric" min="5" max="300" defaultValue={existing?.hrv ?? ""} placeholder="65" aria-label={t("Variabilité de la fréquence cardiaque")} className={inp} />
              </div>
              <p className={hint} style={{ gridColumn: "1 / -1" }}>{t("Relevés du matin sur ta montre ou ta bague (Apple Santé, Garmin, Whoop, Oura...).")}</p>
            </div>
          )}
        </div>
        {state?.error && <p style={{ fontSize: 11, color: "#FDC4C4", marginTop: 8 }}>{state.error}</p>}
        <SaveButton pending={pending} />
      </CardShell>
    </form>
  );
}

export type NutritionTotals = { calories: number; proteins: number; carbs: number; fats: number };
export type BilanPlan = { name: string; mode: "fixed" | "flexible" | "fixed_flexible" };

// Nutrition du bilan (refonte 2026-09-27, "ça doit pas se faire à la main") :
// les calories et macros viennent du tracker, jamais retapées. Avec un plan,
// une seule question : diète suivie ? "Oui" ajoute les repas du plan encore
// vides ce jour-là. Saisie manuelle seulement sans plan ni tracker.
export function NutritionCard({
  today, existing, action, nutritionTotals, plan, trackerHref, onSaved, showNutrition = true, showHunger = true,
}: {
  today: string; existing: DailyLog | null; action: BilanAction; nutritionTotals?: NutritionTotals | null; plan?: BilanPlan | null; trackerHref?: string; onSaved?: () => void; showNutrition?: boolean; showHunger?: boolean;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, null);
  const [followed, setFollowed] = useState<"oui" | "non" | null>(null);
  const href = trackerHref ?? "/dashboard/client/nutrition";

  useEffect(() => {
    if (state?.success) onSaved?.();
  }, [state, onSaved]);

  const choice = (value: "oui" | "non", label: string) => (
    <button
      type="button"
      onClick={() => setFollowed(value)}
      style={{
        flex: 1, height: 40, borderRadius: 10, fontSize: 12, fontWeight: 800,
        border: `1px solid ${followed === value ? "#E01E1E" : "rgba(137,4,4,0.3)"}`,
        background: followed === value ? "#E01E1E" : "transparent",
        color: followed === value ? "#fff" : "rgba(245,237,237,0.6)", cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="log_date" value={today} />
      {followed === "oui" && <input type="hidden" name="diet_followed" value="oui" />}
      <CardShell icon={Apple} title={showNutrition ? "Nutrition" : "Faim"} saved={!!state?.success}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {showNutrition && plan && (
            <div>
              <label className={lbl}>{t("Diète suivie ?")}</label>
              <div style={{ display: "flex", gap: 8 }}>
                {choice("oui", "Oui, comme prévu")}
                {choice("non", "Non, j'ai fait autrement")}
              </div>
              {followed === "oui" && (
                <p className={hint} style={{ color: "rgba(74,222,128,0.75)" }}>
                  {nutritionTotals
                    ? t("Les repas de ton plan pas encore logués ce jour-là seront ajoutés à l'enregistrement.")
                    : `Ton plan "${plan.name}" sera logué pour ce jour-là à l'enregistrement.`}
                </p>
              )}
              {followed === "non" && (
                <p className={hint}>
                  {t("Mets ce que tu as vraiment mangé dans ton")}{" "}
                  <Link href={href} style={{ color: "#E01E1E", fontWeight: 700 }}>{t("tracker")}</Link>
                  {plan.mode === "flexible" ? t(", en changeant les aliments du plan : les repas suivants se recalculent tout seuls.") : t(" : remplace ou ajuste un aliment, le reste suit.")}
                </p>
              )}
            </div>
          )}

          {!showNutrition ? null : nutritionTotals ? (
            <div style={{ borderRadius: 10, border: "1px solid rgba(74,222,128,0.25)", background: "rgba(74,222,128,0.06)", padding: "10px 12px" }}>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(74,222,128,0.8)", margin: "0 0 6px" }}>
                {t("Depuis ton tracker")}
              </p>
              <p style={{ fontSize: 14, color: "#F5EDED", margin: 0 }}>
                <b>{Math.round(nutritionTotals.calories)}{" "}{t("kcal")}</b>
                <span style={{ color: "rgba(245,237,237,0.55)", fontSize: 12 }}>
                  {" "}· P {Math.round(nutritionTotals.proteins)} g · G {Math.round(nutritionTotals.carbs)} g · L {Math.round(nutritionTotals.fats)} g
                </span>
              </p>
              <p className={hint} style={{ marginTop: 4 }}>
                {t("Mis à jour tout seul. Une erreur ?")}{" "}<Link href={href} style={{ color: "#E01E1E", fontWeight: 700 }}>{t("Corrige dans le tracker")}</Link>.
              </p>
            </div>
          ) : (
            !plan && (
              <p className={hint} style={{ margin: 0 }}>
                {t("Logue tes repas dans ton")}{" "}<Link href={href} style={{ color: "#E01E1E", fontWeight: 700 }}>{t("tracker")}</Link>{t(", les calories et macros arrivent ici toutes seules.")}
              </p>
            )
          )}

          {showNutrition && !nutritionTotals && (
            <details>
              <summary style={{ fontSize: 11, color: "rgba(245,237,237,0.45)", cursor: "pointer" }}>{t("Saisir les chiffres à la main")}</summary>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                <div>
                  <label className={lbl}>{t("Protéines (g)")}</label>
                  <input name="proteins_g" type="number" min="0" defaultValue={existing?.proteins_g ?? ""} placeholder="200" aria-label={t("Protéines")} className={inp} />
                </div>
                <div>
                  <label className={lbl}>{t("Glucides (g)")}</label>
                  <input name="carbs_g" type="number" min="0" defaultValue={existing?.carbs_g ?? ""} placeholder="250" aria-label={t("Glucides")} className={inp} />
                </div>
                <div>
                  <label className={lbl}>{t("Lipides (g)")}</label>
                  <input name="fats_g" type="number" min="0" defaultValue={existing?.fats_g ?? ""} placeholder="80" aria-label={t("Lipides")} className={inp} />
                </div>
                <div>
                  <label className={lbl}>{t("Total (kcal)")}</label>
                  <input name="calories_kcal" type="number" min="0" defaultValue={existing?.calories_kcal ?? ""} placeholder="2400" aria-label={t("Calories")} className={inp} />
                </div>
              </div>
            </details>
          )}

          {showHunger && (
            <div>
              <label className={lbl}>{t("Faim ressentie")}</label>
              <TriScale name="hunger" defaultValue={existing?.hunger} />
            </div>
          )}
        </div>
        {state?.error && <p style={{ fontSize: 11, color: "#FDC4C4", marginTop: 8 }}>{state.error}</p>}
        <SaveButton pending={pending} />
      </CardShell>
    </form>
  );
}

// ── Résumés "c'est fait" ────────────────────────────────────────────────
// Demande explicite du 2026-08-15 : une fois le bilan du matin/soir
// rempli pour aujourd'hui, plus besoin de revoir tout le formulaire à
// chaque visite — "c'est fait, c'est fait". Un résumé compact avec un
// seul bouton Modifier, le formulaire complet ne revient que sur demande
// (ou tant qu'il manque des champs obligatoires, voir lib/daily-gate.ts).

const summaryStat = { fontSize: 11, color: "rgba(245,237,237,0.35)" };
const summaryValue = { fontSize: 15, fontWeight: 800, color: "#F5EDED" };

function EditButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        background: "transparent", border: "1px solid rgba(245,237,237,0.15)",
        borderRadius: 999, padding: "5px 12px", fontSize: 10.5, fontWeight: 700,
        color: "rgba(245,237,237,0.5)", cursor: "pointer",
      }}
    >
      <Pencil size={11} />{" "}{t("Modifier")}
    </button>
  );
}

function MorningSummary({ existing, onEdit }: { existing: DailyLog; onEdit: () => void }) {
  const t = useT();
  return (
    <div className="ep-card" style={{ padding: "16px 16px", display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Sun size={16} style={{ color: "#4ade80" }} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, display: "flex", gap: 20 }}>
        {existing.weight_morning != null && (
          <div>
            <p style={summaryStat}>{t("Poids")}</p>
            <p style={summaryValue}>{existing.weight_morning}{" "}{t("kg")}</p>
          </div>
        )}
        {existing.sleep_hours != null && (
          <div>
            <p style={summaryStat}>{t("Sommeil")}</p>
            <p style={summaryValue}>{existing.sleep_hours} h{existing.sleep_rating != null ? ` · ${existing.sleep_rating}%` : ""}</p>
          </div>
        )}
      </div>
      <EditButton onClick={onEdit} />
    </div>
  );
}

function EveningSummary({ existing, onEdit }: { existing: DailyLog; onEdit: () => void }) {
  const t = useT();
  return (
    <div className="ep-card" style={{ padding: "16px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: existing.training_name ? 10 : 0 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <MoonStar size={16} style={{ color: "#4ade80" }} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, display: "flex", gap: 20, flexWrap: "wrap" }}>
          {existing.steps != null && (
            <div>
              <p style={summaryStat}>{t("Pas")}</p>
              <p style={summaryValue}>{existing.steps.toLocaleString("fr-FR")}</p>
            </div>
          )}
          {existing.calories_kcal != null && (
            <div>
              <p style={summaryStat}>{t("Kcal")}</p>
              <p style={summaryValue}>{existing.calories_kcal}</p>
            </div>
          )}
        </div>
        <EditButton onClick={onEdit} />
      </div>
      {existing.training_name && (
        <p style={{ fontSize: 12, color: "rgba(245,237,237,0.45)", margin: 0 }}>
          {existing.training_name === "Repos" ? t("Jour de repos") : `Séance : ${existing.training_name}`}
        </p>
      )}
    </div>
  );
}

export default function DailyBilanForm({
  today,
  existing,
  action,
  nutritionTotals,
  autoSteps,
  plan,
  trackerHref,
  setup,
}: {
  today: string;
  existing: DailyLog | null;
  action: BilanAction;
  nutritionTotals?: NutritionTotals | null;
  autoSteps?: number | null;
  plan?: BilanPlan | null;
  trackerHref?: string;
  setup?: AppSetup | null;
}) {
  // Personnalisation "Mon appli" : seuls les champs choisis sont demandés,
  // et "bilan fait" ne dépend que d'eux.
  const on = {
    poids: isOn(setup, "poids"),
    sommeil: isOn(setup, "sommeil"),
    pas: isOn(setup, "pas"),
    stress: isOn(setup, "stress"),
    digestion: isOn(setup, "digestion"),
    faim: isOn(setup, "faim"),
    nutrition: isOn(setup, "nutrition"),
    entrainement: isOn(setup, "entrainement"),
    energie: isOn(setup, "energie"),
    humeur: isOn(setup, "humeur"),
    hydratation: isOn(setup, "hydratation"),
    courbatures: isOn(setup, "courbatures"),
    cardio_repos: isOn(setup, "cardio_repos"),
  };
  // Même formulaire côté membre et côté coach (Moi) : les liens suivent l'espace.
  const isCoach = trackerHref?.startsWith("/dashboard/coach") ?? false;
  const sleepHref = isCoach ? "/dashboard/coach/moi/tracking" : "/dashboard/client/tracking";
  const logbookHref = isCoach ? "/dashboard/coach/moi/logbook" : "/dashboard/client/logbook";
  const morningDone =
    !!existing && (!on.poids || existing.weight_morning != null) && (!on.sommeil || (existing.sleep_hours != null && existing.sleep_rating != null));
  const eveningDone =
    !!existing &&
    (!on.pas || existing.steps != null) &&
    (!on.digestion || existing.digestion != null) &&
    (!on.stress || existing.stress != null) &&
    (!on.faim || existing.hunger != null);

  const [editingMorning, setEditingMorning] = useState(!morningDone);
  const [editingEvening, setEditingEvening] = useState(!eveningDone);

  // MASTERCLASS.md Axe E : si le bilan du jour change ailleurs (coach,
  // autre onglet) après le premier rendu, revient automatiquement en vue
  // résumé/formulaire selon le nouvel état plutôt que de rester figé sur
  // le choix fait à l'ouverture de la page.
  useEffect(() => {
    setEditingMorning(!morningDone);
  }, [morningDone]);
  useEffect(() => {
    setEditingEvening(!eveningDone);
  }, [eveningDone]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!on.poids && !on.sommeil ? null : morningDone && !editingMorning ? (
        <MorningSummary existing={existing} onEdit={() => setEditingMorning(true)} />
      ) : (
        <>
          {on.poids && <WeightCard today={today} existing={existing} action={action} />}
          {on.sommeil && <SleepCard today={today} existing={existing} action={action} sleepHref={sleepHref} />}
        </>
      )}

      {eveningDone && !editingEvening ? (
        <EveningSummary existing={existing} onEdit={() => setEditingEvening(true)} />
      ) : (
        <>
          {on.entrainement && <TrainingCard today={today} existing={existing} action={action} logbookHref={logbookHref} />}
          {(on.pas || on.digestion || on.stress) && (
            <LifestyleCard today={today} existing={existing} action={action} autoSteps={autoSteps} show={{ pas: on.pas, digestion: on.digestion, stress: on.stress }} />
          )}
          {(on.nutrition || on.faim) && (
            <NutritionCard today={today} existing={existing} action={action} nutritionTotals={nutritionTotals} plan={plan} trackerHref={trackerHref} showNutrition={on.nutrition} showHunger={on.faim} />
          )}
          {(on.energie || on.humeur || on.hydratation || on.courbatures || on.cardio_repos) && (
            <FormeCard today={today} existing={existing} action={action} show={{ energie: on.energie, humeur: on.humeur, hydratation: on.hydratation, courbatures: on.courbatures, cardio_repos: on.cardio_repos }} />
          )}
        </>
      )}
    </div>
  );
}
