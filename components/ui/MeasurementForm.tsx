"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertCircle } from "lucide-react";
import type { MeasurementInput } from "@/app/dashboard/coach/clients/[id]/measurements/actions";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";
const labelCls =
  "text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block";

function numOrNull(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

type FormState = {
  measured_at: string;
  weight: string;
  waist: string;
  hips: string;
  chest: string;
  shoulders: string;
  arm_relaxed: string;
  arm_flexed: string;
  forearm: string;
  thigh: string;
  calf: string;
  abdomen: string;
  neck: string;
  notes: string;
};

function emptyForm(today: string): FormState {
  return {
    measured_at: today,
    weight: "",
    waist: "",
    hips: "",
    chest: "",
    shoulders: "",
    arm_relaxed: "",
    arm_flexed: "",
    forearm: "",
    thigh: "",
    calf: "",
    abdomen: "",
    neck: "",
    notes: "",
  };
}

export default function MeasurementForm({
  clientId,
  saveAction,
}: {
  clientId: string;
  saveAction: (
    clientId: string,
    data: MeasurementInput
  ) => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState<FormState>(() => emptyForm(today));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof FormState, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function numInput(
    key: keyof FormState,
    label: string,
    placeholder: string
  ) {
    return (
      <div>
        <label className={labelCls}>{label}</label>
        <input
          type="number"
          step="0.1"
          min="0"
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
          placeholder={placeholder}
          className={inputCls}
        />
      </div>
    );
  }

  async function handleSave() {
    setError(null);
    setSaving(true);

    const data: MeasurementInput = {
      measured_at: form.measured_at || today,
      weight: numOrNull(form.weight),
      waist: numOrNull(form.waist),
      hips: numOrNull(form.hips),
      chest: numOrNull(form.chest),
      shoulders: numOrNull(form.shoulders),
      arm_relaxed: numOrNull(form.arm_relaxed),
      arm_flexed: numOrNull(form.arm_flexed),
      forearm: numOrNull(form.forearm),
      thigh: numOrNull(form.thigh),
      calf: numOrNull(form.calf),
      abdomen: numOrNull(form.abdomen),
      neck: numOrNull(form.neck),
      notes: form.notes.trim() || null,
    };

    const result = await saveAction(clientId, data);
    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setForm(emptyForm(today));
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5 space-y-5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
        Nouvelle session
      </p>

      {/* Date */}
      <div className="max-w-xs">
        <label className={labelCls}>Date</label>
        <input
          type="date"
          value={form.measured_at}
          onChange={(e) => set("measured_at", e.target.value)}
          className={inputCls}
        />
      </div>

      {/* Weight */}
      <div className="max-w-xs">
        {numInput("weight", "Poids (kg)", "80.0")}
      </div>

      {/* Upper body */}
      <div>
        <p className={labelCls + " mb-3"}>Haut du corps (cm)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {numInput("neck", "Cou", "38")}
          {numInput("shoulders", "Épaules", "115")}
          {numInput("chest", "Poitrine", "95")}
          {numInput("arm_relaxed", "Bras relâché", "33")}
          {numInput("arm_flexed", "Bras fléchi", "36")}
          {numInput("forearm", "Avant-bras", "29")}
        </div>
      </div>

      {/* Torso */}
      <div>
        <p className={labelCls + " mb-3"}>Tronc (cm)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {numInput("waist", "Tour de taille", "80")}
          {numInput("abdomen", "Abdomen", "85")}
          {numInput("hips", "Hanches", "95")}
        </div>
      </div>

      {/* Lower body */}
      <div>
        <p className={labelCls + " mb-3"}>Bas du corps (cm)</p>
        <div className="grid grid-cols-2 gap-3 max-w-xs">
          {numInput("thigh", "Cuisse", "55")}
          {numInput("calf", "Mollet", "37")}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelCls}>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Observations, contexte…"
          rows={2}
          className={inputCls + " resize-none"}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/30 rounded-lg px-4 py-2.5">
          <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`inline-flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg transition-colors ${
            saved
              ? "bg-green-800/60 border border-green-600/30"
              : "bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-60"
          }`}
        >
          {saved ? (
            <>
              <Check size={13} />
              Enregistré
            </>
          ) : saving ? (
            "Enregistrement…"
          ) : (
            "Enregistrer les mesures"
          )}
        </button>
      </div>
    </div>
  );
}
