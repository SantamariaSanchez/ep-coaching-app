"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ruler, ChevronDown, ChevronUp, AlertTriangle, Check } from "lucide-react";
import type { Measurement } from "@/utils/measurements";
import BeforeAfterComparator from "@/components/ui/BeforeAfterComparator";
import { todayInParis } from "@/lib/dates";

// Trou trouvé en creusant "Moi" (2026-09-09) : measurements avait toute une
// infrastructure de lecture déjà construite (BeforeAfterComparator, curseur
// photo + tableau d'écarts) mais AUCUN chemin d'écriture nulle part dans
// toute l'appli — 0 ligne en base, tous comptes confondus. Voir le
// commentaire dans personal-actions.ts pour le détail. Ce composant est la
// première vraie saisie : formulaire replié par défaut (12 champs
// optionnels, personne ne les a tous sous la main à chaque fois), historique
// compact, et réutilise BeforeAfterComparator tel quel (checkins=[] : le
// suivi perso n'a pas de check_ins, seulement une table de mensurations —
// BeforeAfterComparator masque déjà proprement son curseur photo sans
// check-ins, ne montre que le tableau d'écarts).

const FIELDS: { key: keyof Omit<Measurement, "id" | "client_id" | "measured_at" | "notes">; label: string; unit: string }[] = [
  { key: "weight", label: "Poids", unit: "kg" },
  { key: "waist", label: "Taille", unit: "cm" },
  { key: "hips", label: "Hanches", unit: "cm" },
  { key: "abdomen", label: "Abdomen", unit: "cm" },
  { key: "chest", label: "Poitrine", unit: "cm" },
  { key: "shoulders", label: "Épaules", unit: "cm" },
  { key: "arm_relaxed", label: "Bras relâché", unit: "cm" },
  { key: "arm_flexed", label: "Bras contracté", unit: "cm" },
  { key: "forearm", label: "Avant-bras", unit: "cm" },
  { key: "thigh", label: "Cuisse", unit: "cm" },
  { key: "calf", label: "Mollet", unit: "cm" },
  { key: "neck", label: "Cou", unit: "cm" },
];

function fmtDate(d: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d + "T12:00:00"));
}

export type LogMeasurementInput = {
  measuredAt: string;
  weight: number | null;
  waist: number | null;
  hips: number | null;
  chest: number | null;
  shoulders: number | null;
  armRelaxed: number | null;
  armFlexed: number | null;
  forearm: number | null;
  thigh: number | null;
  calf: number | null;
  abdomen: number | null;
  neck: number | null;
  notes: string | null;
};

export default function MeasurementsSection({
  measurements,
  logMeasurement,
}: {
  /** Triées du plus récent au plus ancien. */
  measurements: Measurement[];
  logMeasurement: (input: LogMeasurementInput) => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(measurements.length === 0);
  const [showHistory, setShowHistory] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  // MASTERCLASS.md Axe L : UTC, pas Paris — entre minuit et 1h/2h du matin
  // heure de Paris, la date par défaut ET le max ci-dessous (même bug)
  // pointaient encore sur hier, empêchant purement et simplement de
  // sélectionner la vraie date du jour dans le champ.
  const [date, setDate] = useState(() => todayInParis());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toNumOrNull(v: string): number | null {
    const trimmed = v.trim();
    if (!trimmed) return null;
    const n = parseFloat(trimmed.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await logMeasurement({
      measuredAt: date,
      weight: toNumOrNull(values.weight ?? ""),
      waist: toNumOrNull(values.waist ?? ""),
      hips: toNumOrNull(values.hips ?? ""),
      chest: toNumOrNull(values.chest ?? ""),
      shoulders: toNumOrNull(values.shoulders ?? ""),
      armRelaxed: toNumOrNull(values.arm_relaxed ?? ""),
      armFlexed: toNumOrNull(values.arm_flexed ?? ""),
      forearm: toNumOrNull(values.forearm ?? ""),
      thigh: toNumOrNull(values.thigh ?? ""),
      calf: toNumOrNull(values.calf ?? ""),
      abdomen: toNumOrNull(values.abdomen ?? ""),
      neck: toNumOrNull(values.neck ?? ""),
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setValues({});
    setNotes("");
    setSaved(true);
    setShowForm(false);
    // La nouvelle mensuration ne vit que côté serveur (measurements prop) —
    // sans ce refresh, le formulaire se réinitialise mais l'historique et
    // BeforeAfterComparator restent affichés avec l'ancienne liste jusqu'au
    // prochain rechargement complet.
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 flex items-center gap-1.5">
          <Ruler size={12} className="text-[#E01E1E]" /> Mensurations
        </p>
        {saved && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-green-400">
            <Check size={11} /> Enregistré
          </span>
        )}
      </div>

      {measurements.length > 0 && (
        <p className="text-[11px] text-[#F5EDED]/35 mb-3">
          Dernière prise : {fmtDate(measurements[0].measured_at)}
          {measurements[0].weight != null && ` · ${measurements[0].weight}kg`}
          {measurements[0].waist != null && ` · taille ${measurements[0].waist}cm`}
        </p>
      )}

      {measurements.length >= 2 && (
        <div className="mb-4">
          <BeforeAfterComparator measurements={measurements} checkins={[]} />
        </div>
      )}

      {showForm ? (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={todayInParis()}
              aria-label="Date de la prise"
              className="bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E01E1E]/50"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {FIELDS.map(({ key, label, unit }) => (
              <div key={key}>
                <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-1">
                  {label} <span className="normal-case font-normal text-[#F5EDED]/20">({unit})</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={values[key] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder="N/A"
                  aria-label={label}
                  className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-2.5 py-2 text-sm text-white placeholder:text-[#F5EDED]/15 focus:outline-none focus:border-[#E01E1E]/50"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-1.5">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexte, jeûne, moment de la journée..."
              aria-label="Notes"
              className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50"
            />
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-[11px] text-red-400">
              <AlertTriangle size={12} className="flex-shrink-0" /> {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors"
            >
              {saving ? "…" : "Enregistrer"}
            </button>
            {measurements.length > 0 && (
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/60 transition-colors"
              >
                Annuler
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="text-[11px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors"
        >
          + Nouvelle prise de mensurations
        </button>
      )}

      {measurements.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#890404]/15">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-[#F5EDED]/55 transition-colors"
          >
            {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Historique ({measurements.length})
          </button>
          {showHistory && (
            <div className="mt-3 space-y-1.5">
              {measurements.map((m) => (
                <div key={m.id} className="flex items-center justify-between bg-[#150000] border border-[#890404]/15 rounded-lg px-3 py-2">
                  <span className="text-[11px] text-[#F5EDED]/60 font-semibold">{fmtDate(m.measured_at)}</span>
                  <span className="text-[10.5px] text-[#F5EDED]/35">
                    {[
                      m.weight != null ? `${m.weight}kg` : null,
                      m.waist != null ? `taille ${m.waist}` : null,
                      m.arm_flexed != null ? `bras ${m.arm_flexed}` : null,
                    ].filter(Boolean).join(" · ") || "N/A"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
