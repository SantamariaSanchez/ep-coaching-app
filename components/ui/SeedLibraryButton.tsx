"use client";

import { useState } from "react";
import { DatabaseZap, CheckCircle2 } from "lucide-react";

export default function SeedLibraryButton({
  label,
  action,
}: {
  label: string;
  action: () => Promise<{ error?: string; inserted?: number; updated?: number }>;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ error?: string; inserted?: number; updated?: number } | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);
    const res = await action();
    setResult(res);
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest border border-[var(--color-ep-dark-red)]/30 text-[var(--color-ep-light)]/50 hover:text-[var(--color-ep-light)]/80 hover:border-[var(--color-ep-dark-red)]/60 rounded-lg transition-colors disabled:opacity-50"
      >
        <DatabaseZap size={12} />
        {loading ? "Import en cours…" : label}
      </button>
      {result && !result.error && (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-400">
          <CheckCircle2 size={12} />
          {(result.inserted ?? 0) === 0 && (result.updated ?? 0) === 0
            ? "Déjà à jour"
            : [
                (result.inserted ?? 0) > 0 ? `${result.inserted} ajouté${result.inserted! > 1 ? "s" : ""}` : null,
                (result.updated ?? 0) > 0 ? `${result.updated} corrigé${result.updated! > 1 ? "s" : ""}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
        </span>
      )}
      {result?.error && <span className="text-[10px] font-semibold text-red-400">{result.error}</span>}
    </div>
  );
}
