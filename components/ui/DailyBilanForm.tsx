"use client";

import { useActionState, useEffect, useRef } from "react";
import type { DailyLog } from "@/utils/daily-logs";
import { CheckCircle2 } from "lucide-react";

type BilanAction = (
  prev: { error?: string; success?: boolean } | null,
  formData: FormData
) => Promise<{ error?: string; success?: boolean }>;

const inp =
  "w-full bg-[rgba(0,0,0,0.4)] border border-[rgba(var(--color-ep-dark-red-rgb),0.3)] rounded-lg px-3 py-2.5 text-sm text-[var(--color-ep-light)] placeholder:text-[var(--color-ep-light)]/25 focus:outline-none focus:border-[var(--color-ep-red)]/60 transition-colors";

const lbl = "block text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/40 mb-1.5";

function Section({ title }: { title: string }) {
  return (
    <div style={{ borderBottom: "1px solid rgba(var(--color-ep-dark-red-rgb),0.15)", paddingBottom: 4, marginBottom: 16 }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(var(--color-ep-red-rgb),0.6)", margin: 0 }}>
        {title}
      </p>
    </div>
  );
}

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
            border: "1px solid rgba(var(--color-ep-dark-red-rgb),0.3)",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
            color: "rgba(var(--color-ep-light-rgb),0.4)",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          className="peer-checked:bg-[var(--color-ep-red)] peer-checked:border-[var(--color-ep-red)] peer-checked:text-white"
          >
            {fr}
          </span>
        </label>
      ))}
    </div>
  );
}

function RatingInput({ name, defaultValue }: { name: string; defaultValue?: number | null }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
        <label key={v} style={{ flex: 1, cursor: "pointer" }}>
          <input type="radio" name={name} value={v} defaultChecked={defaultValue === v} className="sr-only peer" />
          <span style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: 32, borderRadius: 6,
            border: "1px solid rgba(var(--color-ep-dark-red-rgb),0.25)",
            fontSize: 10, fontWeight: 700,
            color: "rgba(var(--color-ep-light-rgb),0.35)",
          }}
          className="peer-checked:bg-[var(--color-ep-red)] peer-checked:border-[var(--color-ep-red)] peer-checked:text-white"
          >
            {v}
          </span>
        </label>
      ))}
    </div>
  );
}

export default function DailyBilanForm({ today, existing, action: serverAction }: { today: string; existing: DailyLog | null; action: BilanAction }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(serverAction, null);

  useEffect(() => {
    if (state?.success) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [state]);

  if (state?.success) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center", gap: 12 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CheckCircle2 size={22} style={{ color: "#4ade80" }} />
        </div>
        <p style={{ fontSize: 14, fontWeight: 800, color: "#4ade80", margin: 0, letterSpacing: "-0.01em" }}>
          Bilan enregistré
        </p>
        <p style={{ fontSize: 11, color: "rgba(var(--color-ep-light-rgb),0.3)", margin: 0 }}>
          Tu peux le modifier jusqu&apos;à la fin de la journée.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: "var(--color-ep-red)", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.05em", textTransform: "uppercase" }}
        >
          Modifier
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <input type="hidden" name="log_date" value={today} />

      {/* ── Programme ─────────────────────────────────────────────────────────── */}
      <div>
        <Section title="Programme" />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
            <div>
              <label className={lbl}>Entraînement du jour</label>
              <input name="training_name" defaultValue={existing?.training_name ?? ""} placeholder="Pull, Push, Legs, Repos…" className={inp} />
            </div>
            <div style={{ width: 80 }}>
              <label className={lbl}>Cardio</label>
              <input name="cardio" defaultValue={existing?.cardio ?? ""} placeholder="10'" className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Note de la séance /10</label>
            <RatingInput name="training_rating" defaultValue={existing?.training_rating} />
          </div>
        </div>
      </div>

      {/* ── Lifestyle ─────────────────────────────────────────────────────────── */}
      <div>
        <Section title="Lifestyle" />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className={lbl}>Poids à jeun (kg)</label>
              <input name="weight_morning" type="number" step="0.1" min="30" max="300" defaultValue={existing?.weight_morning ?? ""} placeholder="82.5" className={inp} />
            </div>
            <div>
              <label className={lbl}>Heure de pesée</label>
              <input name="weight_time" defaultValue={existing?.weight_time ?? ""} placeholder="07h00" className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Pas dans la journée</label>
            <input name="steps" type="number" min="0" max="100000" defaultValue={existing?.steps ?? ""} placeholder="8500" className={inp} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className={lbl}>Sommeil (heures)</label>
              <input name="sleep_hours" type="number" step="0.1" min="0" max="24" defaultValue={existing?.sleep_hours ?? ""} placeholder="7.5" className={inp} />
            </div>
            <div>
              <label className={lbl}>Qualité sommeil (%)</label>
              <input name="sleep_rating" type="number" min="0" max="100" defaultValue={existing?.sleep_rating ?? ""} placeholder="80" className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Digestion</label>
            <input name="digestion" defaultValue={existing?.digestion ?? ""} placeholder="OK, Ballonné, Lourd…" className={inp} />
          </div>
          <div>
            <label className={lbl}>Stress</label>
            <TriScale name="stress" defaultValue={existing?.stress} />
          </div>
        </div>
      </div>

      {/* ── Nutrition ─────────────────────────────────────────────────────────── */}
      <div>
        <Section title="Nutrition" />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className={lbl}>Protéines (g)</label>
              <input name="proteins_g" type="number" min="0" defaultValue={existing?.proteins_g ?? ""} placeholder="200" className={inp} />
            </div>
            <div>
              <label className={lbl}>Glucides (g)</label>
              <input name="carbs_g" type="number" min="0" defaultValue={existing?.carbs_g ?? ""} placeholder="250" className={inp} />
            </div>
            <div>
              <label className={lbl}>Lipides (g)</label>
              <input name="fats_g" type="number" min="0" defaultValue={existing?.fats_g ?? ""} placeholder="80" className={inp} />
            </div>
            <div>
              <label className={lbl}>Total (kcal)</label>
              <input name="calories_kcal" type="number" min="0" defaultValue={existing?.calories_kcal ?? ""} placeholder="2400" className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Faim ressentie</label>
            <TriScale name="hunger" defaultValue={existing?.hunger} />
          </div>
        </div>
      </div>

      {state?.error && (
        <p style={{ fontSize: 12, color: "var(--color-ep-pink)", textAlign: "center", margin: 0 }}>{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        style={{
          width: "100%",
          background: pending ? "rgba(var(--color-ep-red-rgb),0.5)" : "var(--color-ep-red)",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          padding: "14px 0",
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          cursor: pending ? "wait" : "pointer",
          transition: "background 0.15s",
        }}
      >
        {pending ? "Enregistrement…" : existing ? "Mettre à jour le bilan" : "Enregistrer le bilan"}
      </button>
    </form>
  );
}
