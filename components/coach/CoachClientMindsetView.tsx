import { Brain, Flame } from "lucide-react";
import Card from "@/components/ui/Card";
import { PROFILE_TYPES, ENVIRONMENTS, OBSTACLES, HABITS } from "@/lib/mindset-content";
import type { MindsetProfile, MindsetHabitLog } from "@/utils/mindset";

// Vue coach en lecture seule du mindset d'un client — avant, rien de tout
// ça (profil, obstacle principal, habitudes) n'était visible côté coach,
// alors que c'est exactement le genre de signal qui aide à adapter
// l'accompagnement (relancer sur la discipline, ménager quelqu'un de
// stressé...). Volontairement partiel : le journal reste privé, jamais
// affiché ici — c'est un espace d'écriture libre (image du corps, doutes,
// stress), pas une donnée de suivi comme les habitudes ou le quiz.

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40">{label}</span>
        <span className="text-xs font-bold text-white">{value}%</span>
      </div>
      <div className="h-2 bg-[#150000] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// Même algorithme que HabitsTab côté client (components/ui/MindsetView.tsx) —
// une série cassée par un seul jour manquant, jamais un simple comptage des
// occurrences qui masquerait les trous.
function streakFor(habitLogs: MindsetHabitLog[], habitKey: string, today: string): number {
  const dates = new Set(habitLogs.filter((l) => l.habit_key === habitKey).map((l) => l.logged_at));
  let streak = 0;
  const cursor = new Date(today + "T12:00:00");
  while (dates.has(cursor.toISOString().split("T")[0])) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function CoachClientMindsetView({
  profile,
  habitLogs,
}: {
  profile: MindsetProfile | null;
  habitLogs: MindsetHabitLog[];
}) {
  const today = todayStr();

  if (!profile) {
    return (
      <Card>
        <div className="flex flex-col items-center text-center py-8 px-2">
          <Brain size={28} className="text-[#E01E1E]/40 mb-3" strokeWidth={1.5} />
          <p className="text-sm font-bold text-white mb-1">Quiz mindset pas encore fait</p>
          <p className="text-xs text-[#F5EDED]/40 max-w-xs">
            Ce client n&apos;a pas encore complété son quiz mindset (Profil, dans son espace).
          </p>
        </div>
      </Card>
    );
  }

  const profileDef = PROFILE_TYPES.find((p) => p.key === profile.profile_type);
  const envDef = ENVIRONMENTS.find((e) => e.key === profile.environment);
  const obstacleDef = OBSTACLES.find((o) => o.key === profile.main_obstacle);

  const activeHabits = HABITS.map((h) => ({ h, streak: streakFor(habitLogs, h.key, today) }))
    .filter(({ streak }) => streak > 0)
    .sort((a, b) => b.streak - a.streak);

  return (
    <div className="space-y-4">
      <Card title="Profil mindset">
        <p className="text-lg font-black text-white mb-1">{profileDef?.label}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#150000] border border-[#890404]/25 text-[#F5EDED]/50">
            {envDef?.label}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#150000] border border-[#890404]/25 text-[#F5EDED]/50">
            Obstacle principal · {obstacleDef?.label}
          </span>
        </div>
        <div className="space-y-3">
          <ScoreBar label="Motivation" value={profile.motivation_score ?? 0} color="#E01E1E" />
          <ScoreBar label="Gestion du stress" value={profile.stress_score ?? 0} color="#60a5fa" />
          <ScoreBar label="Sérénité image corporelle" value={profile.body_image_score ?? 0} color="#fbbf24" />
          <ScoreBar label="Discipline" value={profile.discipline_score ?? 0} color="#4ade80" />
        </div>
      </Card>

      <Card title="Habitudes en cours">
        {activeHabits.length === 0 ? (
          <p className="text-xs text-[#F5EDED]/35">Aucune série en cours sur les 30 derniers jours.</p>
        ) : (
          <div className="space-y-2">
            {activeHabits.map(({ h, streak }) => (
              <div key={h.key} className="flex items-center justify-between">
                <span className="text-sm text-white/85">{h.label}</span>
                <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
                  <Flame size={12} /> {streak}j
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="text-[10px] text-[#F5EDED]/25 leading-relaxed">
        Le journal reste privé, seul le client peut le consulter.
      </p>
    </div>
  );
}
