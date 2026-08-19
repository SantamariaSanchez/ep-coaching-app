"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import type { DailyLog } from "@/utils/daily-logs";
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
  return (
    <div className="ep-card" style={{ padding: "18px 16px", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Icon size={14} style={{ color: "#E01E1E" }} strokeWidth={2} />
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.5)", margin: 0, flex: 1 }}>
          {title}
        </p>
        {saved && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "#4ade80" }}>
            <Check size={12} /> Enregistré
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
      <CardShell icon={Scale} title="Poids du matin" saved={!!state?.success}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label className={lbl}>Poids à jeun (kg)</label>
            <input name="weight_morning" type="number" step="0.1" min="30" max="300" defaultValue={existing?.weight_morning ?? ""} placeholder="82.5" aria-label="82.5" className={inp} autoFocus />
          </div>
          <div>
            <label className={lbl}>Heure de pesée</label>
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
export function TrainingCard({ today, existing, action, onSaved }: { today: string; existing: DailyLog | null; action: BilanAction; onSaved?: () => void }) {
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
      <CardShell icon={Dumbbell} title="Entraînement du jour" saved={!!state?.success}>
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
            Jour d&apos;entraînement
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
            Jour de repos
          </button>
        </div>

        {isRestDay ? (
          <>
            <input type="hidden" name="training_name" value="Repos" />
            <p style={{ fontSize: 12, color: "rgba(245,237,237,0.4)", margin: 0 }}>Profite du repos. 💪</p>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
              <div>
                <label className={lbl}>Séance</label>
                <input name="training_name" defaultValue={existing?.training_name === "Repos" ? "" : (existing?.training_name ?? "")} placeholder="Pull, Push, Legs…" aria-label="Pull, Push, Legs…" className={inp} />
              </div>
              <div style={{ width: 80 }}>
                <label className={lbl}>Cardio</label>
                <input name="cardio" defaultValue={existing?.cardio ?? ""} placeholder="10'" aria-label="10'" className={inp} />
              </div>
            </div>
            <p className={hint}>
              La note de la séance se donne à la fin de l&apos;entraînement, directement depuis le{" "}
              <Link href="/dashboard/client/logbook" style={{ color: "#E01E1E", fontWeight: 700 }}>logbook</Link>. Pas besoin de la redonner ici.
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
export function SleepCard({ today, existing, action, onSaved }: { today: string; existing: DailyLog | null; action: BilanAction; onSaved?: () => void }) {
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) onSaved?.();
  }, [state, onSaved]);

  return (
    <form action={formAction}>
      <input type="hidden" name="log_date" value={today} />
      <CardShell icon={BedDouble} title="Sommeil" saved={!!state?.success}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className={lbl}>Sommeil (heures)</label>
              <input name="sleep_hours" type="number" step="0.1" min="0" max="24" defaultValue={existing?.sleep_hours ?? ""} placeholder="7.5" aria-label="7.5" className={inp} autoFocus />
            </div>
            <div>
              <label className={lbl}>Qualité sommeil (%)</label>
              <input name="sleep_rating" type="number" min="0" max="100" defaultValue={existing?.sleep_rating ?? ""} placeholder="80" aria-label="80" className={inp} />
            </div>
          </div>
          <p className={hint} style={{ marginTop: -8 }}>
            Ton iPhone/montre connectée donne ces chiffres dans l&apos;app Santé/Sommeil, sinon une estimation à l&apos;instinct suffit.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className={lbl}>Coucher (hier soir)</label>
              <input name="bedtime_actual" type="time" defaultValue={existing?.bedtime_actual?.slice(0, 5) ?? ""} aria-label="Heure de coucher" className={inp} />
            </div>
            <div>
              <label className={lbl}>Lever (ce matin)</label>
              <input name="wake_time_actual" type="time" defaultValue={existing?.wake_time_actual?.slice(0, 5) ?? ""} aria-label="Heure de lever" className={inp} />
            </div>
          </div>
          <p className={hint} style={{ marginTop: -8 }}>
            Facultatif, sert juste à suivre ta régularité dans l&apos;onglet{" "}
            <Link href="/dashboard/client/sommeil" style={{ color: "#E01E1E", fontWeight: 700 }}>Sommeil</Link>.
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
}: {
  today: string;
  existing: DailyLog | null;
  action: BilanAction;
  autoSteps?: number | null;
  onSaved?: () => void;
}) {
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
      <CardShell icon={Moon} title="Lifestyle" saved={!!state?.success}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className={lbl}>Pas dans la journée</label>
            <input name="steps" type="number" min="0" max="100000" defaultValue={prefillSteps ?? ""} placeholder="8500" aria-label="8500" className={inp} />
            <p className={hint}>
              <Footprints size={10} style={{ display: "inline", marginRight: 3, verticalAlign: -1 }} />
              {existing?.steps == null && autoSteps != null
                ? "Rempli automatiquement depuis Steps, modifie si besoin."
                : "Regarde dans l'app Santé (iPhone) ou Google Fit / Fit (Android) de ton téléphone, pas besoin d'inventer."}
            </p>
          </div>
          <div>
            <label className={lbl}>Digestion</label>
            <input name="digestion" defaultValue={existing?.digestion ?? ""} placeholder="OK, Ballonné, Lourd…" aria-label="OK, Ballonné, Lourd…" className={inp} />
          </div>
          <div>
            <label className={lbl}>Stress</label>
            <TriScale name="stress" defaultValue={existing?.stress} />
          </div>
        </div>
        {state?.error && <p style={{ fontSize: 11, color: "#FDC4C4", marginTop: 8 }}>{state.error}</p>}
        <SaveButton pending={pending} />
      </CardShell>
    </form>
  );
}

export type NutritionTotals = { calories: number; proteins: number; carbs: number; fats: number };

export function NutritionCard({
  today, existing, action, nutritionTotals, onSaved,
}: {
  today: string; existing: DailyLog | null; action: BilanAction; nutritionTotals?: NutritionTotals | null; onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) onSaved?.();
  }, [state, onSaved]);

  return (
    <form action={formAction}>
      <input type="hidden" name="log_date" value={today} />
      <CardShell icon={Apple} title="Nutrition" saved={!!state?.success}>
        {nutritionTotals && existing?.calories_kcal == null ? (
          <p style={{ fontSize: 10, color: "rgba(74,222,128,0.6)", margin: "-6px 0 12px" }}>
            Pré-rempli depuis ce que tu as déjà loggé dans Nutrition aujourd&apos;hui, modifiable si besoin.
          </p>
        ) : (
          <p className={hint} style={{ margin: "-6px 0 12px" }}>
            Log tes aliments dans{" "}
            <Link href="/dashboard/client/nutrition" style={{ color: "#E01E1E", fontWeight: 700 }}>Nutrition</Link>{" "}
            pour que ces champs se remplissent automatiquement, plutôt que de calculer à la main.
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className={lbl}>Protéines (g)</label>
              <input name="proteins_g" type="number" min="0" defaultValue={existing?.proteins_g ?? (nutritionTotals ? Math.round(nutritionTotals.proteins) : "")} placeholder="200" aria-label="200" className={inp} />
            </div>
            <div>
              <label className={lbl}>Glucides (g)</label>
              <input name="carbs_g" type="number" min="0" defaultValue={existing?.carbs_g ?? (nutritionTotals ? Math.round(nutritionTotals.carbs) : "")} placeholder="250" aria-label="250" className={inp} />
            </div>
            <div>
              <label className={lbl}>Lipides (g)</label>
              <input name="fats_g" type="number" min="0" defaultValue={existing?.fats_g ?? (nutritionTotals ? Math.round(nutritionTotals.fats) : "")} placeholder="80" aria-label="80" className={inp} />
            </div>
            <div>
              <label className={lbl}>Total (kcal)</label>
              <input name="calories_kcal" type="number" min="0" defaultValue={existing?.calories_kcal ?? (nutritionTotals ? Math.round(nutritionTotals.calories) : "")} placeholder="2400" aria-label="2400" className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Faim ressentie</label>
            <TriScale name="hunger" defaultValue={existing?.hunger} />
          </div>
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
      <Pencil size={11} /> Modifier
    </button>
  );
}

function MorningSummary({ existing, onEdit }: { existing: DailyLog; onEdit: () => void }) {
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
        <div>
          <p style={summaryStat}>Poids</p>
          <p style={summaryValue}>{existing.weight_morning} kg</p>
        </div>
        <div>
          <p style={summaryStat}>Sommeil</p>
          <p style={summaryValue}>{existing.sleep_hours} h · {existing.sleep_rating}%</p>
        </div>
      </div>
      <EditButton onClick={onEdit} />
    </div>
  );
}

function EveningSummary({ existing, onEdit }: { existing: DailyLog; onEdit: () => void }) {
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
              <p style={summaryStat}>Pas</p>
              <p style={summaryValue}>{existing.steps.toLocaleString("fr-FR")}</p>
            </div>
          )}
          {existing.calories_kcal != null && (
            <div>
              <p style={summaryStat}>Kcal</p>
              <p style={summaryValue}>{existing.calories_kcal}</p>
            </div>
          )}
        </div>
        <EditButton onClick={onEdit} />
      </div>
      {existing.training_name && (
        <p style={{ fontSize: 12, color: "rgba(245,237,237,0.45)", margin: 0 }}>
          {existing.training_name === "Repos" ? "Jour de repos" : `Séance : ${existing.training_name}`}
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
}: {
  today: string;
  existing: DailyLog | null;
  action: BilanAction;
  nutritionTotals?: NutritionTotals | null;
  autoSteps?: number | null;
}) {
  const morningDone = !!existing && existing.weight_morning != null && existing.sleep_hours != null && existing.sleep_rating != null;
  const eveningDone = !!existing && existing.steps != null && existing.digestion != null && existing.stress != null && existing.hunger != null;

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
      {morningDone && !editingMorning ? (
        <MorningSummary existing={existing} onEdit={() => setEditingMorning(true)} />
      ) : (
        <>
          <WeightCard today={today} existing={existing} action={action} />
          <SleepCard today={today} existing={existing} action={action} />
        </>
      )}

      {eveningDone && !editingEvening ? (
        <EveningSummary existing={existing} onEdit={() => setEditingEvening(true)} />
      ) : (
        <>
          <TrainingCard today={today} existing={existing} action={action} />
          <LifestyleCard today={today} existing={existing} action={action} autoSteps={autoSteps} />
          <NutritionCard today={today} existing={existing} action={action} nutritionTotals={nutritionTotals} />
        </>
      )}
    </div>
  );
}
