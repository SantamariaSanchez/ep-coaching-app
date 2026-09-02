"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Quote, Calendar, Moon, Smartphone, Target, Utensils, Sparkles, EyeOff,
  ClipboardList, Wind, GlassWater, Activity, Backpack, Flag, Check,
  BedDouble, HeartPulse, AlertTriangle, PenLine, Lock, ChevronRight, Scale,
  Pill,
} from "lucide-react";
import { HABITS, type JournalPrompt } from "@/lib/mindset-content";
import { AGENDA_ICON_MAP } from "@/lib/agenda-presets";
import type { ScheduleBlock } from "@/utils/agenda";
import type { MindsetHabitLog } from "@/utils/mindset";
import type { BiometricLog, BiometricInsight } from "@/utils/biometrics";
import type { ClientSupplement } from "@/utils/supplements";

// Item 34 : réutilise le même mécanisme que les habitudes mindset
// (mindset_habit_logs, habit_key en texte libre) plutôt qu'une nouvelle
// table + RLS — la clé "supplement:<id>" ne rentre jamais en collision
// avec les clés fixes de HABITS, et la série/streak marche déjà pareil.
function supplementHabitKey(supplementId: string): string {
  return `supplement:${supplementId}`;
}

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
  todayWeight,
  logWeight,
  supplements,
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
  todayWeight: number | null;
  logWeight: (prev: { error?: string; success?: boolean } | null, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  supplements: ClientSupplement[];
}) {
  const [loggedKeys, setLoggedKeys] = useState(new Set(habitLogs.map((h) => h.habit_key)));
  const [isPending, startTransition] = useTransition();
  const [journalText, setJournalText] = useState("");
  const [journalMood, setJournalMood] = useState<number | null>(null);
  const [journalSaved, setJournalSaved] = useState(false);
  const [journalSaving, setJournalSaving] = useState(false);
  const [weightValue, setWeightValue] = useState(todayWeight != null ? String(todayWeight) : "");
  const [weightSaved, setWeightSaved] = useState(false);
  const [weightSaving, setWeightSaving] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);

  async function handleSaveWeight() {
    if (!weightValue.trim()) return;
    setWeightSaving(true);
    setWeightError(null);
    const fd = new FormData();
    fd.set("log_date", todayStr);
    fd.set("weight_morning", weightValue);
    fd.set("weight_time", new Date().toTimeString().slice(0, 5));
    const res = await logWeight(null, fd);
    setWeightSaving(false);
    if (res.error) setWeightError(res.error);
    else setWeightSaved(true);
  }

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

      {/* Poids du matin — accès direct, sans passer par le bilan complet */}
      <section className="animate-fade-up stagger-1" style={{ marginBottom: 24 }}>
        <SectionLabel icon={Scale}>Poids du matin</SectionLabel>
        <div className="ep-card" style={{ padding: "14px 16px" }}>
          {weightSaved ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Check size={15} style={{ color: "#4ade80" }} strokeWidth={3} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#4ade80" }}>
                {weightValue} kg enregistrés
              </p>
              <button
                type="button"
                onClick={() => setWeightSaved(false)}
                style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "rgba(245,237,237,0.35)", background: "none", border: "none", cursor: "pointer" }}
              >
                Modifier
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="number"
                step="0.1"
                min="30"
                max="300"
                value={weightValue}
                onChange={(e) => setWeightValue(e.target.value)}
                placeholder="82.5 kg" aria-label="82.5 kg"
                className="ep-input"
                style={{ flex: 1 }}
                autoFocus={todayWeight == null}
              />
              <button
                type="button"
                onClick={handleSaveWeight}
                disabled={weightSaving || !weightValue.trim()}
                className="ep-btn-primary"
                style={{ fontSize: 11, padding: "10px 16px", whiteSpace: "nowrap" }}
              >
                {weightSaving ? "…" : "Enregistrer"}
              </button>
            </div>
          )}
          {weightError && <p style={{ color: "#FDC4C4", fontSize: 11, margin: "8px 0 0" }}>{weightError}</p>}
        </div>
      </section>

      {/* Agenda du jour — ouvert à tout client connecté (audit de cohérence
          2026-09-02) : la page /dashboard/client/agenda elle-même n'a jamais
          eu de restriction d'abonnement (emploi du temps perso + score
          d'habitudes, pas du contenu livré par un coach), cette carte était
          la seule à afficher un cadenas qui ne correspondait à aucun vrai
          verrou. */}
      <section className="animate-fade-up stagger-1" style={{ marginBottom: 24 }}>
        <SectionLabel icon={Calendar}>Ton programme du jour</SectionLabel>
        {todayBlocks.length === 0 ? (
          <Link href="/dashboard/client/agenda" className="ep-card" style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none" }}>
            <span style={{ fontSize: 12.5, color: "rgba(245,237,237,0.4)" }}>Rien de prévu aujourd&apos;hui dans ton agenda.</span>
            <ChevronRight size={14} style={{ color: "rgba(245,237,237,0.2)" }} />
          </Link>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todayBlocks.map((b) => {
              const BlockIcon = b.icon ? AGENDA_ICON_MAP[b.icon] : null;
              return (
              <div key={b.id} className="ep-card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 3, height: 28, borderRadius: 2, background: b.color || "#E01E1E", flexShrink: 0 }} />
                {BlockIcon && (
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${b.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <BlockIcon size={13} style={{ color: b.color }} strokeWidth={2} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#F5EDED" }}>{b.label}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "rgba(245,237,237,0.35)" }}>
                    {b.start_time.slice(0, 5)} à {b.end_time.slice(0, 5)}
                  </p>
                  {b.tasks && b.tasks.length > 0 && (
                    <ul style={{ margin: "4px 0 0", padding: 0, listStyle: "none" }}>
                      {b.tasks.map((t, i) => (
                        <li key={i} style={{ display: "flex", gap: 5, fontSize: 11, color: "rgba(245,237,237,0.5)", lineHeight: 1.4 }}>
                          <span style={{ color: b.color || "#E01E1E", flexShrink: 0 }}>•</span> {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              );
            })}
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
                  {biometric.sleep_hours != null ? `${biometric.sleep_hours}h` : "···"}
                </p>
              </div>
              <div>
                <p className="ep-label" style={{ marginBottom: 4 }}>Récup.</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: "#F5EDED", margin: 0 }}>
                  {biometric.readiness_score != null ? biometric.readiness_score : "···"}
                </p>
              </div>
              <div>
                <p className="ep-label" style={{ marginBottom: 4 }}>HRV</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: "#F5EDED", margin: 0 }}>
                  {biometric.hrv_ms != null ? `${biometric.hrv_ms}ms` : "···"}
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

      {/* Compléments du jour (item 34) — uniquement s'il y a une liste
          active, pour ne pas afficher une section vide à tout le monde */}
      {supplements.length > 0 && (
        <section className="animate-fade-up stagger-3" style={{ marginBottom: 24 }}>
          <SectionLabel icon={Pill}>Compléments du jour</SectionLabel>
          <div className="ep-card" style={{ padding: "8px 16px" }}>
            {supplements.map((s, i) => {
              const key = supplementHabitKey(s.id);
              const checked = loggedKeys.has(key);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleToggleHabit(key)}
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: checked ? "rgba(245,237,237,0.4)" : "#F5EDED", textDecoration: checked ? "line-through" : "none" }}>
                      {s.name}
                    </span>
                    {(s.dosage || s.timing) && (
                      <span style={{ display: "block", fontSize: 10.5, color: "rgba(245,237,237,0.3)" }}>
                        {[s.dosage, s.timing].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

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
                placeholder="Écris librement…" aria-label="Écris librement…"
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
