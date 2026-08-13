"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, Dumbbell, ArrowLeft } from "lucide-react";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";
const labelCls = "text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block";

const ACTIVITY_MULTIPLIERS = [
  { key: "sedentaire", label: "Sédentaire (peu ou pas de sport)", value: 1.2 },
  { key: "leger", label: "Légèrement actif (1 à 3 séances/semaine)", value: 1.375 },
  { key: "modere", label: "Modérément actif (3 à 5 séances/semaine)", value: 1.55 },
  { key: "actif", label: "Très actif (6 à 7 séances/semaine)", value: 1.725 },
  { key: "extreme", label: "Extrêmement actif (sport intense quotidien)", value: 1.9 },
];

type Tab = "calories" | "1rm";

// Outils publics, sans compte (item 18) : les formules de calcul (TDEE,
// macros) existent déjà côté coaching interne (NutritionForm.tsx), mais
// jamais exposées à quelqu'un qui n'est pas encore membre. Ici volontairement
// simplifié (multiplicateur d'activité standard plutôt que le détail
// entraînement/pas/activité pro utilisé une fois vraiment coaché) : un
// visiteur anonyme n'a pas ce niveau de détail à portée de main, et l'objectif
// est une estimation rapide, pas un plan complet.
export default function OutilsPage() {
  const [tab, setTab] = useState<Tab>("calories");

  return (
    <div className="page-transition" style={{ padding: "32px 20px 100px", maxWidth: 520, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/ressources"
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/60 transition-colors mb-4"
        >
          <ArrowLeft size={11} /> Ressources
        </Link>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          EP Coaching
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Outils gratuits</h1>
        <p className="mt-2 text-sm text-[#F5EDED]/45">
          Deux calculateurs rapides, sans compte. Pour un suivi qui s'ajuste vraiment à toi dans la durée,
          un coaching complet fait bien plus qu'une formule figée.
        </p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-[#890404]/20 overflow-x-auto">
        <button
          onClick={() => setTab("calories")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px whitespace-nowrap ${
            tab === "calories" ? "text-[#E01E1E] border-b-2 border-[#E01E1E]" : "text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
          }`}
        >
          <Calculator size={13} /> Calories &amp; macros
        </button>
        <button
          onClick={() => setTab("1rm")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px whitespace-nowrap ${
            tab === "1rm" ? "text-[#E01E1E] border-b-2 border-[#E01E1E]" : "text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
          }`}
        >
          <Dumbbell size={13} /> Charge maximale (1RM)
        </button>
      </div>

      {tab === "calories" ? <CaloriesCalculator /> : <OneRepMaxCalculator />}
    </div>
  );
}

function CaloriesCalculator() {
  const [gender, setGender] = useState<"Homme" | "Femme">("Homme");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [activity, setActivity] = useState(ACTIVITY_MULTIPLIERS[2].key);

  const result = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseFloat(age);
    if (!w || !h || !a || w <= 0 || h <= 0 || a <= 0) return null;

    const bmr = gender === "Homme" ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
    const mult = ACTIVITY_MULTIPLIERS.find((m) => m.key === activity)?.value ?? 1.55;
    const tdee = bmr * mult;

    const proteinsG = 2.0 * w;
    const fatsG = 1.0 * w;
    const carbsG = Math.max(0, (tdee - proteinsG * 4 - fatsG * 9) / 4);

    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      proteinsG: Math.round(proteinsG),
      fatsG: Math.round(fatsG),
      carbsG: Math.round(carbsG),
    };
  }, [gender, weight, height, age, activity]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setGender("Homme")}
          className={`py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest border transition-colors ${
            gender === "Homme" ? "bg-[#E01E1E]/15 border-[#E01E1E]/40 text-[#E01E1E]" : "border-[#890404]/25 text-[#F5EDED]/40"
          }`}
        >
          Homme
        </button>
        <button
          onClick={() => setGender("Femme")}
          className={`py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest border transition-colors ${
            gender === "Femme" ? "bg-[#E01E1E]/15 border-[#E01E1E]/40 text-[#E01E1E]" : "border-[#890404]/25 text-[#F5EDED]/40"
          }`}
        >
          Femme
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Poids (kg)</label>
          <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Taille (cm)</label>
          <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Âge</label>
          <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="28" className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Niveau d&apos;activité</label>
        <select value={activity} onChange={(e) => setActivity(e.target.value)} className={inputCls}>
          {ACTIVITY_MULTIPLIERS.map((m) => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
      </div>

      {result && (
        <div className="ep-card" style={{ padding: 20, marginTop: 4 }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1">
            Maintenance estimée
          </p>
          <p className="text-3xl font-black text-white mb-4">
            {result.tdee} <span className="text-sm font-normal text-[#F5EDED]/40">kcal / jour</span>
          </p>
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#890404]/15">
            {[
              { label: "Protéines", value: result.proteinsG, color: "#E01E1E" },
              { label: "Glucides", value: result.carbsG, color: "#4ade80" },
              { label: "Lipides", value: result.fatsG, color: "#fbbf24" },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <p className="text-lg font-black" style={{ color: m.color }}>{m.value}g</p>
                <p className="text-[9px] uppercase tracking-widest text-[#F5EDED]/30 mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[10.5px] text-[#F5EDED]/30 mt-4 leading-relaxed">
            Estimation de maintenance (métabolisme de base × niveau d&apos;activité). Pour prendre du muscle,
            ajoute environ 200 à 400 kcal ; pour perdre du gras, retire environ 300 à 500 kcal.
          </p>
        </div>
      )}
    </div>
  );
}

function OneRepMaxCalculator() {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");

  const result = useMemo(() => {
    const w = parseFloat(weight);
    const r = parseFloat(reps);
    if (!w || !r || w <= 0 || r <= 0) return null;
    if (r === 1) return { oneRm: Math.round(w) };
    // Formule d'Epley — la plus courante, fiable jusqu'à environ 10-12 reps.
    const oneRm = w * (1 + r / 30);
    return { oneRm: Math.round(oneRm) };
  }, [weight, reps]);

  const percentages = useMemo(() => {
    if (!result) return [];
    return [95, 90, 85, 80, 75, 70].map((pct) => ({
      pct,
      kg: Math.round((result.oneRm * pct) / 100),
    }));
  }, [result]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Charge soulevée (kg)</label>
          <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="80" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Répétitions faites</label>
          <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="5" className={inputCls} />
        </div>
      </div>

      {result && (
        <div className="ep-card" style={{ padding: 20, marginTop: 4 }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1">
            Charge maximale estimée (1RM)
          </p>
          <p className="text-3xl font-black text-white mb-4">
            {result.oneRm} <span className="text-sm font-normal text-[#F5EDED]/40">kg</span>
          </p>
          {percentages.length > 0 && (
            <div className="pt-3 border-t border-[#890404]/15">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/25 mb-2">
                Zones de travail
              </p>
              <div className="grid grid-cols-3 gap-2">
                {percentages.map((p) => (
                  <div key={p.pct} className="bg-black/20 rounded-lg py-2 text-center">
                    <p className="text-sm font-black text-white">{p.kg}kg</p>
                    <p className="text-[9px] text-[#F5EDED]/30">{p.pct}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-[10.5px] text-[#F5EDED]/30 mt-4 leading-relaxed">
            Formule d&apos;Epley, fiable jusqu&apos;à 10-12 répétitions. Au delà, l&apos;estimation devient
            moins précise.
          </p>
        </div>
      )}
    </div>
  );
}
