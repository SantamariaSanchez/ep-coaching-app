import { Lightbulb, AlertTriangle } from "lucide-react";
import type { ClientSuggestion } from "@/lib/client-suggestions";

// Suggestions concrètes dérivées de la fiche client — pour que remplir la
// fiche serve vraiment à quelque chose plutôt que d'être un formulaire mort.
export default function ClientSuggestionsPanel({ suggestions }: { suggestions: ClientSuggestion[] }) {
  if (suggestions.length === 0) return null;

  return (
    <div className="bg-(--ep-s1) border border-amber-500/20 rounded-xl p-4">
      <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-amber-400/80 mb-3">
        <Lightbulb size={11} /> À prendre en compte ({suggestions.length})
      </p>
      <div className="space-y-2.5">
        {suggestions.map((s) => (
          <div key={s.id} className="flex items-start gap-2.5">
            {s.severity === "warning" ? (
              <AlertTriangle size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
            ) : (
              <Lightbulb size={13} className="text-(--ep-ink)/30 mt-0.5 flex-shrink-0" />
            )}
            <p className="text-xs text-(--ep-ink)/70 leading-relaxed">{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
