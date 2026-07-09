import { Lock, Gift, Check } from "lucide-react";
import { RANKS, getRankForPoints, isEligibleForLegendReward } from "@/lib/gamification-types";
import ProgressBar from "@/components/ui/ProgressBar";

// Carte complète "rang + points" — utilisée sur le profil perso (avec le
// détail de la progression et de la voie de déblocage) et sur le profil
// d'un autre membre (lecture seule).
export default function PointsProgressCard({
  points,
  isSubscribed,
  showLadder = true,
}: {
  points: number;
  isSubscribed: boolean;
  showLadder?: boolean;
}) {
  const { rank, next, progressPct } = getRankForPoints(points);
  const legendEligible = isEligibleForLegendReward(points, isSubscribed);

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{rank.emoji}</span>
          <div>
            <p className="text-sm font-black text-white">{rank.label}</p>
            <p className="text-[10px] text-[#F5EDED]/35">{points} pts cumulés</p>
          </div>
        </div>
        {legendEligible && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <Gift size={11} /> Oura Ring débloquée
          </span>
        )}
      </div>

      {next ? (
        <div className="mt-3">
          <ProgressBar
            value={progressPct}
            color="red"
            label={`Vers ${next.label} ${next.emoji}`}
            showPercent
            height={5}
          />
          <p className="text-[10px] text-[#F5EDED]/30 mt-1.5">
            Encore {next.minPoints - points} pts avant le prochain rang.
          </p>
        </div>
      ) : (
        <p className="text-[10px] text-[#F5EDED]/30 mt-2">Rang maximum atteint. Respect.</p>
      )}

      {showLadder && (
        <div className="mt-4 pt-3 border-t border-[#890404]/15 space-y-1.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/25 mb-1.5">
            Paliers à débloquer
          </p>
          {RANKS.filter((r) => r.unlocks || r.reward).map((r) => {
            const reached = points >= r.minPoints;
            return (
              <div key={r.key} className="flex items-start gap-2">
                {reached ? (
                  <Check size={12} className="text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Lock size={11} className="text-[#F5EDED]/20 flex-shrink-0 mt-0.5" />
                )}
                <p className={`text-[11px] leading-snug ${reached ? "text-[#F5EDED]/60" : "text-[#F5EDED]/30"}`}>
                  <span className="font-bold">{r.emoji} {r.label}</span>
                  {" : "}
                  {r.unlocks?.join(", ")}
                  {r.reward ? (r.unlocks ? " + " : "") + r.reward : ""}
                </p>
              </div>
            );
          })}
          {!isSubscribed && (
            <p className="text-[10px] text-[#F5EDED]/25 italic pt-1">
              Ou débloque tout immédiatement avec l&apos;abonnement.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
