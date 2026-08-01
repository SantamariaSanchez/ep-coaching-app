"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Quote, Calendar, Moon, Smartphone, Target, Utensils, Sparkles, EyeOff,
  ClipboardList, Wind, GlassWater, Activity, Backpack, Flag, Check,
  BedDouble, HeartPulse, AlertTriangle, PenLine, Lock, ChevronRight,
} from "lucide-react";
import { HABITS, type JournalPrompt } from "@/lib/mindset-content";
import type { ScheduleBlock } from "@/utils/agenda";
import type { MindsetHabitLog } from "@/utils/mindset";
import type { BiometricLog, BiometricInsight } from "@/utils/biometrics";

const ICONS: Record<string, React.ElementType> = {
  Moon, Smartphone, Target, Utensils, Sparkles, EyeOff, ClipboardList, Wind,
  GlassWater, Activity, Backpack, Flag,
};

const SEVERITY_COLOR: Record<string, string> = {
  info: "#60a5fa",
  warning: "#fbbf24",
  critical: "#E01E1E",
};

function SectionLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <p className="ep-section-title" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
      <Icon size={11} /> {children}
    </p>
  );
}

export default function AujourdhuiView({
  firstName,
  todayBlocks,
  habitLogs,
  isSubscribedClient,
  biometric,
  insight,
  dailyQuote,
  promptOfDay,
  todayStr,
  toggleHabitLog,
  addJournalEntry,
}: {
  firstName: string;
  todayBlocks: ScheduleBlock[];
  habitLogs: MindsetHabitLog[];
  isSubscribedClient: boolean;
  biometric: BiometricLog | null;
  insight: BiometricInsight | null;
  dailyQuote: string;
  promptOfDay: JournalPrompt;
  todayStr: string;
  toggleHabitLog: (habitKey: string, date: string, checked: boolean) => Promise<{ error?: string }>;
  addJournalEntry: (params: { promptKey: string | null; content: string; mood: number | null }) => Promise<{ error?: string; id?: string }>;
}) {
  const [loggedKeys, setLoggedKeys] = useState(new Set(habitLogs.map((h) => h.habit_key)));
  const [isPending, startTransition] = useTransition();
  const [journalText, setJournalText] = useState("");
  const [journalMood, setJournalMood] = useState<number | null>(null);
  const [journalSaved, setJournalSaved] = useState(false);
  const [journalSaving, setJournalSaving] = useState(false);

  function handleToggleHabit(key: string) {
    const wasChecked = loggedKeys.has(key);
    const next = new Set(loggedKeys);
    if (wasChecked) next.delete(key); else next.add(key);
    setLoggedKeys(next);
    startTransition(() => {
      toggleHabitLog(key, todayStr, !wasChecked);
    });
  }

  async function handleJournalSubmit() {
    if (!journalText.trim()) return;
    setJournalSaving(true);
    const res = await addJournalEntry({ promptKey: promptOfDay.key, content: journalText, mood: journalMood });
    setJournalSaving(false);
    if (!res.error) {
      setJournalSaved(true);
      setJournalText("");
    }
  }

  const doneCount = HABITS.filter((h) => loggedKeys.has(h.key)).length;

  return (
    <div className="page-transition" style={{ padding: "32px 20px 100px", maxWidth: 560, margin: "0 auto" }}>
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 24 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>
          {new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}
        </p>
        <h1 className="ep-h1">Salut {firstName}</h1>
        <div className="ep-card" style={{ padding: "14px 16px", marginTop: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Quote size={14} style={{ color: "#E01E1E", flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 12.5, color: "rgba(245,237,237,0.6)", lineHeight: 1.6, fontStyle: "italic" }}>
            {dailyQuote}
          </p>
        </div>
      </div>

      {/* Agenda du jour */}
      <section className="animate-fade-up stagger-1" style={{ marginBottom: 24 }}>
        <SectionLabel icon={Calendar}>Ton programme du jour</SectionLabel>
        {!isSubscribedClient ? (
          <Link href="/dashboard/client/abonnement" className="ep-card" style={{ padding: "16px", display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <Lock size={16} style={{ color: "rgba(245,237,237,0.3)", flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: "rgba(245,237,237,0.4)", flex: 1 }}>
              L&apos;agenda personnel est réservé aux clients coachés.
            </span>
            <ChevronRight size={14} style={{ color: "rgba(245,237,237,0.2)" }} />
          </Link>
        ) : todayBlocks.length === 0 ? (
          <Link href="/dashboard/client/agenda" className="ep-card" style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none" }}>
            <span style={{ fontSize: 12.5, color: "rgba(245,237,237,0.4)" }}>Rien de prévu aujourd&apos;hui dans ton agenda.</span>
            <ChevronRight size={14} style={{ color: "rgba(245,237,237,0.2)" }} />
          </Link>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todayBlocks.map((b) => (
              <div key={b.id} className="ep-card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 3, height: 28, borderRadius: 2, background: b.color || "#E01E1E", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#F5EDED" }}>{b.label}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "rgba(245,237,237,0.35)" }}>
                    {b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sommeil & récup (Oura) */}
      <section className="animate-fade-up stagger-2" style={{ marginBottom: 24 }}>
        <SectionLabel icon={BedDouble}>Sommeil &amp; récupération</SectionLabel>
        {!isSubscribedClient ? (
          <Link href="/dashboard/client/abonnement" className="ep-card" style={{ padding: "16px", display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <Lock size={16} style={{ color: "rgba(245,237,237,0.3)", flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: "rgba(245,237,237,0.4)", flex: 1 }}>
              Le suivi sommeil/récupération (connexion Oura) est réservé aux clients coachés.
            </span>
            <ChevronRight size={14} style={{ color: "rgba(245,237,237,0.2)" }} />
          </Link>
        ) : biometric ? (
          <div className="ep-card" style={{ padding: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div>
                <p className="ep-label" style={{ marginBottom: 4 }}>Sommeil</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: "#F5EDED", margin: 0 }}>
                  {biometric.sleep_hours != null ? `${biometric.sleep_hours}h` : "–"}
                </p>
              </div>
              <div>
                <p className="ep-label" style={{ marginBottom: 4 }}>Récup.</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: "#F5EDED", margin: 0 }}>
                  {biometric.readiness_score != null ? biometric.readiness_score : "–"}
                </p>
              </div>
              <div>
                <p className="ep-label" style={{ marginBottom: 4 }}>HRV</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: "#F5EDED", margin: 0 }}>
                  {biometric.hrv_ms != null ? `${biometric.hrv_ms}ms` : "–"}
                </p>
              </div>
            </div>
            {insight && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(224,30,30,0.1)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <AlertTriangle size={14} style={{ color: SEVERITY_COLOR[insight.severity], flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: "#F5EDED", fontWeight: 700 }}>{insight.message}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "rgba(245,237,237,0.45)", lineHeight: 1.5 }}>{insight.suggestion}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link href="/dashboard/client/tracking" className="ep-card" style={{ padding: "16px", display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <HeartPulse size={16} style={{ color: "#E01E1E", flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: "rgba(245,237,237,0.4)", flex: 1 }}>
              Connecte ta bague Oura pour voir ton sommeil et ta récupération ici.
            </span>
            <ChevronRight size={14} style={{ color: "rgba(245,237,237,0.2)" }} />
          </Link>
        )}
      </section>

      {/* Habitudes du jour */}
      <section className="animate-fade-up stagger-3" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <SectionLabel icon={Check}>Habitudes du jour</SectionLabel>
          <span style={{ fontSize: 11, fontWeight: 700, color: doneCount === HABITS.length ? "#4ade80" : "rgba(245,237,237,0.3)" }}>
            {doneCount}/{HABITS.length}
          </span>
        </div>
        <div className="ep-card" style={{ padding: "8px 16px" }}>
          {HABITS.map((h, i) => {
            const Icon = ICONS[h.icon] ?? Check;
            const checked = loggedKeys.has(h.key);
            return (
              <button
                key={h.key}
                type="button"
                onClick={() => handleToggleHabit(h.key)}
                disabled={isPending}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 0", background: "none", border: "none", cursor: "pointer",
                  borderTop: i > 0 ? "1px solid rgba(224,30,30,0.08)" : "none", textAlign: "left",
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  border: `1px solid ${checked ? "#4ade80" : "rgba(224,30,30,0.25)"}`,
                  background: checked ? "rgba(74,222,128,0.15)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {checked && <Check size={13} style={{ color: "#4ade80" }} strokeWidth={3} />}
                </div>
                <Icon size={14} style={{ color: checked ? "rgba(245,237,237,0.3)" : "#E01E1E", flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: checked ? "rgba(245,237,237,0.4)" : "#F5EDED", textDecoration: checked ? "line-through" : "none" }}>
                  {h.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Mindset / journal */}
      <section className="animate-fade-up stagger-4">
        <SectionLabel icon={PenLine}>{promptOfDay.label}</SectionLabel>
        <div className="ep-card" style={{ padding: "16px" }}>
          {journalSaved ? (
            <p style={{ margin: 0, fontSize: 13, color: "#4ade80", fontWeight: 600 }}>✓ Enregistré dans ton journal.</p>
          ) : (
            <>
              <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "rgba(245,237,237,0.5)", lineHeight: 1.6 }}>
                {promptOfDay.prompt}
              </p>
              <textarea
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                rows={3}
                placeholder="Écris librement…"
                className="ep-input"
                style={{ resize: "none", marginBottom: 10 }}
              />
              <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setJournalMood(m)}
                      style={{
                        width: 28, height: 28, borderRadius: "50%", cursor: "pointer",
                        border: `1px solid ${journalMood === m ? "#E01E1E" : "rgba(224,30,30,0.15)"}`,
                        background: journalMood === m ? "rgba(224,30,30,0.15)" : "transparent",
                        color: journalMood === m ? "#E01E1E" : "rgba(245,237,237,0.3)",
                        fontSize: 11, fontWeight: 700,
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleJournalSubmit}
                  disabled={journalSaving || !journalText.trim()}
                  className="ep-btn-primary"
                  style={{ fontSize: 11, padding: "9px 18px" }}
                >
                  {journalSaving ? "…" : "Enregistrer"}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
