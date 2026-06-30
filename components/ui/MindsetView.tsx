"use client";

import { useState, useMemo } from "react";
import {
  Brain,
  ListChecks,
  Lightbulb,
  PenLine,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Quote,
  Flame,
  Trash2,
  Moon,
  Smartphone,
  Target,
  Utensils,
  Sparkles,
  EyeOff,
  ClipboardList,
  Wind,
  GlassWater,
  Activity,
  Backpack,
  Flag,
  Check,
} from "lucide-react";
import {
  QUIZ_QUESTIONS,
  computeQuizResult,
  PROFILE_TYPES,
  ENVIRONMENTS,
  OBSTACLES,
  HABITS,
  TIPS,
  getTipsFor,
  getDailyQuote,
  JOURNAL_PROMPTS,
  getPromptOfDay,
  type QuizResult,
  type TipCategory,
} from "@/lib/mindset-content";
import type { MindsetProfile, MindsetHabitLog, MindsetJournalEntry } from "@/utils/mindset";

const ICONS: Record<string, React.ElementType> = {
  Moon, Smartphone, Target, Utensils, Sparkles, EyeOff, ClipboardList, Wind,
  GlassWater, Activity, Backpack, Flag,
};

const CATEGORY_LABELS: Record<TipCategory, string> = {
  motivation: "Motivation",
  stress: "Stress",
  image_corporelle: "Image corporelle",
  discipline: "Discipline",
  social: "Social",
  alimentation: "Alimentation",
  competition: "Compétition",
  recuperation: "Récupération",
};

function fmtDate(d: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(d + "T12:00:00")
  );
}

// ── Quiz ──────────────────────────────────────────────────────────────────────

function QuizFlow({ onComplete }: { onComplete: (result: QuizResult) => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const q = QUIZ_QUESTIONS[step];
  const progress = Math.round(((step + 1) / QUIZ_QUESTIONS.length) * 100);

  function selectAnswer(value: string) {
    const next = { ...answers, [q.key]: value };
    setAnswers(next);
    if (step < QUIZ_QUESTIONS.length - 1) {
      setStep((s) => s + 1);
    } else {
      const result = computeQuizResult(next);
      if (result) onComplete(result);
    }
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
          Question {step + 1} / {QUIZ_QUESTIONS.length}
        </p>
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-[#F5EDED]/60 transition-colors"
          >
            <ChevronLeft size={12} /> Retour
          </button>
        )}
      </div>

      <div className="h-1.5 bg-[#150000] rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-[#E01E1E] to-[#B00202] rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-base font-bold text-white mb-4 leading-snug">{q.question}</p>

      <div className="space-y-2">
        {q.options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => selectAnswer(opt.value)}
            className="w-full text-left px-4 py-3 bg-[#150000] border border-[#890404]/25 hover:border-[#E01E1E]/50 hover:bg-[#250101] rounded-lg text-sm text-white transition-colors flex items-center justify-between gap-3"
          >
            {opt.label}
            <ChevronRight size={14} className="text-[#F5EDED]/20 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40">{label}</span>
        <span className="text-xs font-bold text-white">{value}%</span>
      </div>
      <div className="h-2 bg-[#150000] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function ProfileTab({
  profile,
  onSave,
}: {
  profile: MindsetProfile | null;
  onSave: (result: QuizResult) => Promise<void>;
}) {
  const [showQuiz, setShowQuiz] = useState(!profile?.quiz_completed_at);
  const [saving, setSaving] = useState(false);

  async function handleComplete(result: QuizResult) {
    setSaving(true);
    await onSave(result);
    setSaving(false);
    setShowQuiz(false);
  }

  if (showQuiz) {
    return (
      <div className="space-y-4">
        {saving ? (
          <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-8 text-center">
            <p className="text-xs text-[#F5EDED]/40 uppercase tracking-widest font-semibold">Sauvegarde…</p>
          </div>
        ) : (
          <QuizFlow onComplete={handleComplete} />
        )}
        {profile?.quiz_completed_at && (
          <button
            onClick={() => setShowQuiz(false)}
            className="text-[10px] text-[#F5EDED]/30 hover:text-[#F5EDED]/60 transition-colors"
          >
            Annuler et garder mon profil actuel
          </button>
        )}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-[#1f0101] border border-dashed border-[#890404]/30 rounded-xl p-8 text-center">
        <Brain size={32} className="text-[#E01E1E]/40 mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm font-bold text-white mb-1">Découvre ton profil mindset</p>
        <p className="text-xs text-[#F5EDED]/35 mb-5 max-w-sm mx-auto">
          7 questions pour comprendre ton rapport à la motivation, au stress, à ton image et à la discipline — et recevoir des conseils vraiment adaptés à ta situation.
        </p>
        <button
          onClick={() => setShowQuiz(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] text-white rounded-xl transition-colors"
        >
          Commencer le quiz
        </button>
      </div>
    );
  }

  const profileDef = PROFILE_TYPES.find((p) => p.key === profile.profile_type);
  const envDef = ENVIRONMENTS.find((e) => e.key === profile.environment);
  const obstacleDef = OBSTACLES.find((o) => o.key === profile.main_obstacle);

  return (
    <div className="space-y-4">
      <div className="bg-[#1f0101] border border-[#E01E1E]/30 rounded-xl p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#E01E1E]/70 mb-1">Ton profil</p>
        <p className="text-lg font-black text-white mb-1">{profileDef?.label}</p>
        <p className="text-xs text-[#F5EDED]/40 mb-4 leading-relaxed">{profileDef?.description}</p>
        <div className="flex flex-wrap gap-2 mb-5">
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
      </div>

      <button
        onClick={() => setShowQuiz(true)}
        className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-[#E01E1E] transition-colors"
      >
        <RotateCcw size={12} /> Refaire le quiz
      </button>
    </div>
  );
}

// ── Habitudes ─────────────────────────────────────────────────────────────────

function HabitsTab({
  today,
  habitLogs,
  onToggle,
}: {
  today: string;
  habitLogs: MindsetHabitLog[];
  onToggle: (habitKey: string, checked: boolean) => void;
}) {
  const [optimisticLogs, setOptimisticLogs] = useState(habitLogs);

  const loggedToday = useMemo(
    () => new Set(optimisticLogs.filter((l) => l.logged_at === today).map((l) => l.habit_key)),
    [optimisticLogs, today]
  );

  function streakFor(habitKey: string): number {
    const dates = new Set(optimisticLogs.filter((l) => l.habit_key === habitKey).map((l) => l.logged_at));
    let streak = 0;
    const cursor = new Date(today + "T12:00:00");
    while (dates.has(cursor.toISOString().split("T")[0])) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function handleToggle(habitKey: string) {
    const checked = !loggedToday.has(habitKey);
    setOptimisticLogs((prev) =>
      checked
        ? [...prev, { id: `optimistic-${habitKey}`, client_id: "", habit_key: habitKey, logged_at: today }]
        : prev.filter((l) => !(l.habit_key === habitKey && l.logged_at === today))
    );
    onToggle(habitKey, checked);
  }

  const doneCount = HABITS.filter((h) => loggedToday.has(h.key)).length;

  const byCategory = useMemo(() => {
    const map: Record<string, typeof HABITS> = {};
    for (const h of HABITS) {
      if (!map[h.category]) map[h.category] = [];
      map[h.category].push(h);
    }
    return map;
  }, []);

  const CATEGORY_TITLES: Record<string, string> = {
    sommeil: "Sommeil",
    nutrition: "Nutrition & mindset",
    stress: "Gestion du stress",
    discipline: "Discipline",
    social: "Social",
    recuperation: "Récupération",
  };

  return (
    <div className="space-y-5">
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-0.5">Aujourd&apos;hui</p>
          <p className="text-lg font-black text-white">{doneCount} / {HABITS.length} habitudes</p>
        </div>
        <Flame size={28} className={doneCount > 0 ? "text-[#E01E1E]" : "text-[#F5EDED]/15"} strokeWidth={1.7} />
      </div>

      {Object.entries(byCategory).map(([cat, habits]) => (
        <div key={cat}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-2">
            {CATEGORY_TITLES[cat] ?? cat}
          </p>
          <div className="space-y-2">
            {habits.map((h) => {
              const Icon = ICONS[h.icon] ?? Target;
              const checked = loggedToday.has(h.key);
              const streak = streakFor(h.key);
              return (
                <div
                  key={h.key}
                  onClick={() => handleToggle(h.key)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    checked ? "bg-[#1f0101] border-[#E01E1E]/35" : "bg-[#150000] border-[#890404]/20 hover:border-[#890404]/40"
                  }`}
                >
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${
                      checked ? "bg-[#E01E1E] border-[#E01E1E]" : "border-[#890404]/40"
                    }`}
                  >
                    {checked && <Check size={13} className="text-white" strokeWidth={3} />}
                  </span>
                  <Icon size={16} className={checked ? "text-[#E01E1E]" : "text-[#F5EDED]/30"} strokeWidth={1.8} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${checked ? "text-white" : "text-[#F5EDED]/70"}`}>{h.label}</p>
                    <p className="text-[10px] text-[#F5EDED]/30 leading-snug">{h.description}</p>
                  </div>
                  {streak > 1 && (
                    <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
                      <Flame size={11} /> {streak}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Conseils ──────────────────────────────────────────────────────────────────

function TipsTab({ profile }: { profile: MindsetProfile | null }) {
  const [activeCategory, setActiveCategory] = useState<TipCategory | "all" | "pour_toi">(
    profile ? "pour_toi" : "all"
  );

  const personalized = useMemo(
    () => getTipsFor(profile?.profile_type ?? null, profile?.environment ?? null),
    [profile]
  );

  const categories = useMemo(() => {
    const set = new Set(TIPS.map((t) => t.category));
    return Array.from(set);
  }, []);

  const visible = useMemo(() => {
    if (activeCategory === "pour_toi") return personalized;
    if (activeCategory === "all") return TIPS;
    return TIPS.filter((t) => t.category === activeCategory);
  }, [activeCategory, personalized]);

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-[#1f0101] to-[#150000] border border-[#890404]/40 rounded-xl p-5 flex items-start gap-3">
        <Quote size={18} className="text-[#E01E1E] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-white font-medium italic leading-relaxed">{getDailyQuote()}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {profile && (
          <button
            onClick={() => setActiveCategory("pour_toi")}
            className={`flex-shrink-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full border transition-colors ${
              activeCategory === "pour_toi"
                ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]"
                : "border-[#890404]/25 text-[#F5EDED]/40"
            }`}
          >
            Pour toi
          </button>
        )}
        <button
          onClick={() => setActiveCategory("all")}
          className={`flex-shrink-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full border transition-colors ${
            activeCategory === "all" ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]" : "border-[#890404]/25 text-[#F5EDED]/40"
          }`}
        >
          Tout
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`flex-shrink-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full border transition-colors ${
              activeCategory === c ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]" : "border-[#890404]/25 text-[#F5EDED]/40"
            }`}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {visible.map((tip) => (
          <div key={tip.id} className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Lightbulb size={13} className="text-amber-400" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30">
                {CATEGORY_LABELS[tip.category]}
              </span>
            </div>
            <p className="text-sm font-bold text-white mb-1">{tip.title}</p>
            <p className="text-xs text-[#F5EDED]/45 leading-relaxed">{tip.body}</p>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="text-xs text-[#F5EDED]/25 italic text-center py-6">Aucun conseil dans cette catégorie.</p>
        )}
      </div>
    </div>
  );
}

// ── Journal ───────────────────────────────────────────────────────────────────

const MOODS = [
  { value: 1, emoji: "😞" },
  { value: 2, emoji: "😕" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "🙂" },
  { value: 5, emoji: "😄" },
];

function JournalTab({
  entries,
  onAdd,
  onDelete,
}: {
  entries: MindsetJournalEntry[];
  onAdd: (promptKey: string | null, content: string, mood: number | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const dayPrompt = getPromptOfDay();
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(dayPrompt.key);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [localEntries, setLocalEntries] = useState(entries);

  const activePrompt = JOURNAL_PROMPTS.find((p) => p.key === selectedPrompt) ?? null;

  async function handleSubmit() {
    if (!content.trim()) return;
    setSaving(true);
    await onAdd(selectedPrompt, content.trim(), mood);
    setLocalEntries((prev) => [
      {
        id: `optimistic-${Date.now()}`,
        client_id: "",
        entry_date: new Date().toISOString().split("T")[0],
        prompt_key: selectedPrompt,
        content: content.trim(),
        mood,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    setContent("");
    setMood(null);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setLocalEntries((prev) => prev.filter((e) => e.id !== id));
    await onDelete(id);
  }

  return (
    <div className="space-y-5">
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-3">Choisis un thème</p>
        <div className="flex gap-2 overflow-x-auto pb-3">
          {JOURNAL_PROMPTS.map((p) => (
            <button
              key={p.key}
              onClick={() => setSelectedPrompt(p.key)}
              className={`flex-shrink-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full border transition-colors ${
                selectedPrompt === p.key ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]" : "border-[#890404]/25 text-[#F5EDED]/40"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {activePrompt && (
          <p className="text-sm text-white italic mb-3 leading-relaxed">{activePrompt.prompt}</p>
        )}

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="Écris librement…"
          className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/60 transition-colors resize-none"
        />

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/30 mr-1">Humeur</span>
            {MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMood(mood === m.value ? null : m.value)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-colors ${
                  mood === m.value ? "bg-[#E01E1E]/20 border border-[#E01E1E]/50" : "border border-transparent hover:bg-[#150000]"
                }`}
              >
                {m.emoji}
              </button>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || saving}
            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-40 text-white rounded-lg transition-colors"
          >
            {saving ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {localEntries.length === 0 ? (
          <p className="text-xs text-[#F5EDED]/25 italic text-center py-6">Aucune entrée pour l&apos;instant.</p>
        ) : (
          localEntries.map((entry) => {
            const prompt = JOURNAL_PROMPTS.find((p) => p.key === entry.prompt_key);
            const moodEmoji = MOODS.find((m) => m.value === entry.mood)?.emoji;
            return (
              <div key={entry.id} className="bg-[#150000] border border-[#890404]/15 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30">
                      {fmtDate(entry.entry_date)}
                    </span>
                    {prompt && (
                      <span className="text-[9px] font-semibold uppercase tracking-widest text-[#E01E1E]/60">
                        {prompt.label}
                      </span>
                    )}
                    {moodEmoji && <span className="text-sm">{moodEmoji}</span>}
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-[#F5EDED]/15 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Tab = "profil" | "habitudes" | "conseils" | "journal";

interface Props {
  today: string;
  mindsetProfile: MindsetProfile | null;
  habitLogs: MindsetHabitLog[];
  journalEntries: MindsetJournalEntry[];
  saveMindsetQuiz: (result: QuizResult) => Promise<{ error?: string }>;
  toggleHabitLog: (habitKey: string, date: string, checked: boolean) => Promise<{ error?: string }>;
  addJournalEntry: (params: { promptKey: string | null; content: string; mood: number | null }) => Promise<{ error?: string; id?: string }>;
  deleteJournalEntry: (entryId: string) => Promise<{ error?: string }>;
}

export default function MindsetView({
  today,
  mindsetProfile,
  habitLogs,
  journalEntries,
  saveMindsetQuiz,
  toggleHabitLog,
  addJournalEntry,
  deleteJournalEntry,
}: Props) {
  const [tab, setTab] = useState<Tab>("profil");

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "profil", label: "Profil", icon: Brain },
    { key: "habitudes", label: "Habitudes", icon: ListChecks },
    { key: "conseils", label: "Conseils", icon: Lightbulb },
    { key: "journal", label: "Journal", icon: PenLine },
  ];

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mental & comportement
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <Brain size={26} className="text-[#E01E1E]" strokeWidth={1.8} />
          Mindset
        </h1>
      </div>

      <div className="flex gap-1 mb-6 border-b border-[#890404]/20 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px whitespace-nowrap ${
              tab === key ? "text-[#E01E1E] border-b-2 border-[#E01E1E]" : "text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {tab === "profil" && (
        <ProfileTab
          profile={mindsetProfile}
          onSave={async (result) => { await saveMindsetQuiz(result); }}
        />
      )}

      {tab === "habitudes" && (
        <HabitsTab
          today={today}
          habitLogs={habitLogs}
          onToggle={(habitKey, checked) => { toggleHabitLog(habitKey, today, checked); }}
        />
      )}

      {tab === "conseils" && <TipsTab profile={mindsetProfile} />}

      {tab === "journal" && (
        <JournalTab
          entries={journalEntries}
          onAdd={async (promptKey, content, mood) => { await addJournalEntry({ promptKey, content, mood }); }}
          onDelete={async (id) => { await deleteJournalEntry(id); }}
        />
      )}
    </div>
  );
}
