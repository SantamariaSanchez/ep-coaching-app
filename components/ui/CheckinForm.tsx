"use client";

import { useActionState } from "react";
import { submitCheckin } from "@/app/dashboard/client/checkin/actions";

const inputClass =
  "w-full bg-[#2a0101] border border-[#890404]/50 rounded-lg px-4 py-2.5 text-white placeholder-[#F5EDED]/25 text-sm focus:outline-none focus:border-[#E01E1E] transition-colors";

const labelClass =
  "block text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/45 mb-1.5";

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest text-[#F5EDED]/60 mb-4 pb-2 border-b border-[#890404]/20">
      {title}
    </h3>
  );
}

function ScaleInput({ name, label }: { name: string; label: string }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((v) => (
          <label key={v} className="flex-1 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={v}
              className="peer sr-only"
            />
            <span className="flex items-center justify-center h-10 rounded-lg border border-[#890404]/40 text-sm font-bold text-[#F5EDED]/40 peer-checked:bg-[#E01E1E] peer-checked:border-[#E01E1E] peer-checked:text-white transition-colors hover:border-[#E01E1E]/60 hover:text-[#F5EDED]/70">
              {v}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function MeasurementInput({ name, label, placeholder }: {
  name: string;
  label: string;
  placeholder: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label} <span className="text-[#F5EDED]/25 font-normal normal-case tracking-normal">(cm)</span></label>
      <input
        name={name}
        type="number"
        step="0.1"
        min="0"
        max="999"
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

export default function CheckinForm({ showMeasurements = false }: { showMeasurements?: boolean }) {
  const [state, formAction, isPending] = useActionState(submitCheckin, null);

  if (state && "success" in state) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center mb-4">
          <span className="text-2xl">✓</span>
        </div>
        <p className="text-lg font-black uppercase tracking-widest text-green-400">
          Check-in envoyé
        </p>
        <p className="text-xs text-[#F5EDED]/35 mt-2">
          Ton coach va recevoir ton bilan et te répondre rapidement.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-8">
      {/* Hidden flag for measurements */}
      {showMeasurements && (
        <input type="hidden" name="includes_measurements" value="true" />
      )}

      {/* Poids */}
      <div>
        <SectionHeader title="Poids" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Poids actuel (kg)</label>
            <input
              name="weight"
              type="number"
              step="0.1"
              min="30"
              max="300"
              placeholder="82.5"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Poids moyen semaine (kg)</label>
            <input
              name="weight_avg"
              type="number"
              step="0.1"
              min="30"
              max="300"
              placeholder="83.0"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* ── Mensurations mensuelles (conditionnel) ────────────────────────────── */}
      {showMeasurements && (
        <div className="border border-[#E01E1E]/25 rounded-xl p-5 bg-[#E01E1E]/5">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-[#E01E1E] text-white">
              Bilan mensuel
            </span>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#F5EDED]/60">
              Mensurations
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MeasurementInput name="waist"      label="Tour de taille"  placeholder="75" />
            <MeasurementInput name="hips"       label="Hanches"         placeholder="95" />
            <MeasurementInput name="chest"      label="Poitrine"        placeholder="100" />
            <MeasurementInput name="shoulders"  label="Épaules"         placeholder="120" />
            <MeasurementInput name="arm_relaxed" label="Bras détendu"   placeholder="38" />
            <MeasurementInput name="arm_flexed"  label="Bras fléchi"    placeholder="40" />
            <MeasurementInput name="forearm"    label="Avant-bras"      placeholder="30" />
            <MeasurementInput name="thigh"      label="Cuisse"          placeholder="58" />
            <MeasurementInput name="calf"       label="Mollet"          placeholder="38" />
          </div>
        </div>
      )}

      {/* Nutrition */}
      <div>
        <SectionHeader title="Nutrition" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Adhérence au plan (%)</label>
            <input
              name="nutrition_adherence"
              type="number"
              min="0"
              max="100"
              placeholder="85"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Calories/jour (kcal)</label>
            <input
              name="calories_per_day"
              type="number"
              min="500"
              max="10000"
              placeholder="2200"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Activité */}
      <div>
        <SectionHeader title="Activité" />
        <div className="max-w-xs">
          <label className={labelClass}>Pas/jour (moyenne)</label>
          <input
            name="steps_per_day"
            type="number"
            min="0"
            max="100000"
            placeholder="8500"
            className={inputClass}
          />
        </div>
      </div>

      {/* Récupération */}
      <div>
        <SectionHeader title="Récupération" />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Heures de sommeil</label>
            <input
              name="sleep_hours"
              type="number"
              step="0.5"
              min="0"
              max="24"
              placeholder="7.5"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>HRV</label>
            <input
              name="hrv"
              type="number"
              min="0"
              max="300"
              placeholder="55"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>FC repos (bpm)</label>
            <input
              name="resting_hr"
              type="number"
              min="30"
              max="150"
              placeholder="58"
              className={inputClass}
            />
          </div>
        </div>
        <ScaleInput name="digestion" label="Digestion (1 = difficile, 5 = parfaite)" />
      </div>

      {/* Bien-être */}
      <div>
        <SectionHeader title="Bien-être" />
        <div className="mb-4">
          <ScaleInput
            name="general_feeling"
            label="Ressenti général (1 = épuisé, 5 = au top)"
          />
        </div>
        <div>
          <label className={labelClass}>Notes libres</label>
          <textarea
            name="client_notes"
            rows={4}
            placeholder="Comment tu te sens cette semaine ? Difficultés, points positifs..."
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      {state && "error" in state && (
        <p className="text-[#FDC4C4] text-xs text-center">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white font-bold uppercase tracking-widest text-sm py-4 rounded-xl transition-colors"
      >
        {isPending ? "Envoi..." : "Envoyer mon check-in"}
      </button>
    </form>
  );
}
