"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { CheckIn } from "@/utils/checkins";
import { replyToCheckin } from "@/app/dashboard/coach/clients/[id]/checkins/actions";

const FEELING = ["", "Épuisé", "Fatigué", "Correct", "Bien", "Au top"];
const DIGESTION = ["", "Difficile", "Inconfort", "Correcte", "Bien", "Parfaite"];

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-[#890404]/10 last:border-0">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 shrink-0">
        {label}
      </span>
      <span className="text-xs font-medium text-white text-right">{value}</span>
    </div>
  );
}

function CoachReplyForm({ checkin }: { checkin: CheckIn }) {
  const [state, formAction, isPending] = useActionState(replyToCheckin, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 pt-4 border-t border-[#890404]/20 space-y-3">
      <input type="hidden" name="checkin_id" value={checkin.id} />
      <input type="hidden" name="client_id" value={checkin.client_id} />

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/45 mb-1.5">
          Ton retour
        </label>
        <textarea
          name="coach_notes"
          rows={3}
          required
          placeholder="Analyse, conseils, encouragements..."
          className="w-full bg-[#2a0101] border border-[#890404]/50 rounded-lg px-4 py-2.5 text-white placeholder-[#F5EDED]/25 text-sm focus:outline-none focus:border-[#E01E1E] transition-colors resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/45 mb-1.5">
            Note (/10)
          </label>
          <select
            name="coach_rating"
            className="w-full bg-[#2a0101] border border-[#890404]/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#E01E1E] transition-colors"
          >
            <option value="">—</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}/10
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest py-2.5 rounded-lg transition-colors mt-5"
        >
          {isPending ? "Envoi..." : "Envoyer le retour"}
        </button>
      </div>

      {state && "error" in state && (
        <p className="text-[#FDC4C4] text-xs">{state.error}</p>
      )}
    </form>
  );
}

export default function CheckinCard({ checkin }: { checkin: CheckIn }) {
  const [expanded, setExpanded] = useState(!checkin.coach_replied_at);

  const weekDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(checkin.week_start));

  return (
    <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <div>
            <p className="text-sm font-bold text-white">
              Semaine {checkin.week_number}
            </p>
            <p className="text-[10px] text-[#F5EDED]/35">
              Du {weekDate}
            </p>
          </div>
          {!checkin.coach_replied_at && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
              Sans réponse
            </span>
          )}
          {checkin.coach_replied_at && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
              {checkin.coach_rating ? `${checkin.coach_rating}/10` : "Répondu"}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-[#F5EDED]/30 shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-[#F5EDED]/30 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
                Poids & Nutrition
              </p>
              <Row label="Poids" value={checkin.weight ? `${checkin.weight} kg` : null} />
              <Row label="Poids moy." value={checkin.weight_avg ? `${checkin.weight_avg} kg` : null} />
              <Row label="Adhérence" value={checkin.nutrition_adherence ? `${checkin.nutrition_adherence}%` : null} />
              <Row label="Calories/j" value={checkin.calories_per_day ? `${checkin.calories_per_day} kcal` : null} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
                Récupération & Activité
              </p>
              <Row label="Pas/j" value={checkin.steps_per_day ? checkin.steps_per_day.toLocaleString("fr-FR") : null} />
              <Row label="Sommeil" value={checkin.sleep_hours ? `${checkin.sleep_hours}h` : null} />
              <Row label="HRV" value={checkin.hrv ? String(checkin.hrv) : null} />
              <Row label="FC repos" value={checkin.resting_hr ? `${checkin.resting_hr} bpm` : null} />
              <Row
                label="Digestion"
                value={checkin.digestion ? `${checkin.digestion}/5 — ${DIGESTION[checkin.digestion]}` : null}
              />
              <Row
                label="Ressenti"
                value={checkin.general_feeling ? `${checkin.general_feeling}/5 — ${FEELING[checkin.general_feeling]}` : null}
              />
            </div>
          </div>

          {checkin.client_notes && (
            <div className="pt-3 border-t border-[#890404]/10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1.5">
                Notes client
              </p>
              <p className="text-sm text-[#F5EDED]/70 leading-relaxed">
                {checkin.client_notes}
              </p>
            </div>
          )}

          {checkin.coach_replied_at && checkin.coach_notes ? (
            <div className="pt-3 border-t border-[#890404]/10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-green-500/60 mb-1.5">
                Ton retour{checkin.coach_rating ? ` — ${checkin.coach_rating}/10` : ""}
              </p>
              <p className="text-sm text-[#F5EDED]/70 leading-relaxed">
                {checkin.coach_notes}
              </p>
            </div>
          ) : (
            <CoachReplyForm checkin={checkin} />
          )}
        </div>
      )}
    </div>
  );
}
