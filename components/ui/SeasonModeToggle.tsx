"use client";

import { useState } from "react";

export default function SeasonModeToggle({
  currentMode,
  setSeasonMode,
}: {
  currentMode: "off_season" | "prep";
  setSeasonMode: (mode: "off_season" | "prep") => Promise<{ error?: string }>;
}) {
  const [mode, setMode] = useState(currentMode);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: "off_season" | "prep") {
    if (next === mode || saving) return;
    setMode(next);
    setSaving(true);
    await setSeasonMode(next);
    setSaving(false);
  }

  return (
    <div className="flex gap-2 mb-4">
      {[
        { value: "off_season" as const, label: "🧘 Off-season" },
        { value: "prep" as const, label: "🔥 Prep" },
      ].map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleChange(opt.value)}
          disabled={saving}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border transition-colors disabled:opacity-60 ${
            mode === opt.value
              ? "bg-[var(--color-ep-red)]/15 border-[var(--color-ep-red)]/45 text-[var(--color-ep-red)]"
              : "border-[var(--color-ep-dark-red)]/25 text-[var(--color-ep-light)]/40 hover:text-[var(--color-ep-light)]/70"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
