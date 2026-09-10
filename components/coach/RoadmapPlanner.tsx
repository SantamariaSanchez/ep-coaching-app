"use client";

import { useState, useTransition } from "react";
import { Plus, X, Check, Lightbulb, Save } from "lucide-react";
import { ROADMAP_HORIZONS, ROADMAP_HORIZON_INFO, type RoadmapHorizon } from "@/lib/coach-roadmap";
import {
  saveRoadmapVision,
  addRoadmapMilestone,
  toggleRoadmapMilestone,
  deleteRoadmapMilestone,
} from "@/app/dashboard/coach/business/roadmap-actions";

export interface RoadmapMilestone {
  id: string;
  horizon: RoadmapHorizon;
  label: string;
  done: boolean;
}

export default function RoadmapPlanner({
  initialVisions,
  initialMilestones,
}: {
  initialVisions: Partial<Record<RoadmapHorizon, string>>;
  initialMilestones: RoadmapMilestone[];
}) {
  const [horizon, setHorizon] = useState<RoadmapHorizon>("1_an");
  const [visions, setVisions] = useState(initialVisions);
  const [milestones, setMilestones] = useState(initialMilestones);
  const [newMilestone, setNewMilestone] = useState("");
  const [visionSaved, setVisionSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const info = ROADMAP_HORIZON_INFO[horizon];
  const horizonMilestones = milestones.filter((m) => m.horizon === horizon);
  const doneCount = horizonMilestones.filter((m) => m.done).length;

  function saveVision() {
    startTransition(async () => {
      const result = await saveRoadmapVision(horizon, visions[horizon] ?? "");
      if (!result.error) {
        setVisionSaved(true);
        setTimeout(() => setVisionSaved(false), 2000);
      }
    });
  }

  function addMilestone() {
    const label = newMilestone.trim();
    if (!label) return;
    setNewMilestone("");
    startTransition(async () => {
      const result = await addRoadmapMilestone(horizon, label);
      if (result.success && result.id) {
        setMilestones((prev) => [...prev, { id: result.id!, horizon, label, done: false }]);
      }
    });
  }

  function toggleMilestone(id: string) {
    const target = milestones.find((m) => m.id === id);
    if (!target) return;
    const nextDone = !target.done;
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, done: nextDone } : m)));
    startTransition(async () => {
      const result = await toggleRoadmapMilestone(id, nextDone);
      if (result.error) {
        setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, done: !nextDone } : m)));
      }
    });
  }

  function removeMilestone(id: string) {
    const previous = milestones;
    setMilestones((prev) => prev.filter((m) => m.id !== id));
    startTransition(async () => {
      const result = await deleteRoadmapMilestone(id);
      if (result.error) setMilestones(previous);
    });
  }

  return (
    <div>
      {/* Onglets horizon */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-0.5">
        {ROADMAP_HORIZONS.map((h) => {
          const active = h === horizon;
          const count = milestones.filter((m) => m.horizon === h).length;
          return (
            <button
              key={h}
              type="button"
              onClick={() => setHorizon(h)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${
                active
                  ? "bg-[#E01E1E] text-white"
                  : "bg-[#150000] text-[#F5EDED]/40 border border-[#890404]/25 hover:text-[#F5EDED]/70"
              }`}
            >
              {ROADMAP_HORIZON_INFO[h].label}
              {count > 0 && <span className="ml-1.5 opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="ep-card" style={{ padding: "20px 20px 18px" }}>
        <p className="text-sm font-black text-white mb-1">{info.prompt}</p>

        <textarea
          value={visions[horizon] ?? ""}
          onChange={(e) => setVisions((prev) => ({ ...prev, [horizon]: e.target.value }))}
          onBlur={saveVision}
          placeholder={info.placeholder}
          aria-label={info.prompt}
          rows={4}
          maxLength={20000}
          className="w-full mt-2 bg-[#150000] border border-[#890404]/25 rounded-lg px-3.5 py-3 text-[13px] text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/50 resize-none leading-relaxed"
        />
        <div className="flex items-center justify-end gap-1.5 mt-1.5 h-4">
          {visionSaved && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-green-400">
              <Save size={10} /> Enregistré
            </span>
          )}
        </div>

        {/* Repères, jamais insérés automatiquement — juste pour amorcer la réflexion. */}
        <div className="flex items-start gap-2 mt-3 pt-3 border-t border-[#890404]/10">
          <Lightbulb size={13} className="text-[#F5EDED]/25 flex-shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-1.5">
            {info.examples.map((ex) => (
              <span
                key={ex}
                className="text-[10px] text-[#F5EDED]/35 bg-[#150000] border border-[#890404]/15 rounded-full px-2.5 py-1"
              >
                {ex}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Jalons de cet horizon */}
      <div className="mt-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2.5">
          Jalons · {doneCount}/{horizonMilestones.length || 0}
        </p>
        <div className="space-y-1.5 mb-2.5">
          {horizonMilestones.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2.5 bg-[#1f0101] border border-[#890404]/20 rounded-lg px-3.5 py-2.5"
            >
              <button
                type="button"
                onClick={() => toggleMilestone(m.id)}
                disabled={isPending}
                className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  m.done ? "bg-[#4ade80] border-[#4ade80]" : "border-[#890404]/40 bg-transparent"
                }`}
              >
                {m.done && <Check size={12} className="text-[#0a1f0a]" strokeWidth={3} />}
              </button>
              <span className={`flex-1 min-w-0 text-[13px] ${m.done ? "text-[#F5EDED]/35 line-through" : "text-white"}`}>
                {m.label}
              </span>
              <button
                type="button"
                onClick={() => removeMilestone(m.id)}
                className="flex-shrink-0 text-[#F5EDED]/20 hover:text-red-400 transition-colors"
                aria-label="Supprimer ce jalon"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newMilestone}
            onChange={(e) => setNewMilestone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addMilestone()}
            placeholder="Ajouter un jalon pour cet horizon..." aria-label="Ajouter un jalon pour cet horizon..."
            className="flex-1 min-w-0 bg-[#150000] border border-[#890404]/25 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/50"
          />
          <button
            type="button"
            onClick={addMilestone}
            disabled={!newMilestone.trim() || isPending}
            className="flex-shrink-0 flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-40 text-white text-[11px] font-bold uppercase tracking-widest px-4 rounded-lg transition-colors"
          >
            <Plus size={13} /> Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
