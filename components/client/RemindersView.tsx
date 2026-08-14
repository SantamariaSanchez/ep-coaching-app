"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientSupabase } from "@/lib/supabase-client";
import { Bell, BellOff, Trash2, Plus, X, Check, AlertCircle } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Reminder {
  id: string;
  client_id: string;
  label: string;
  time: string;
  days: string[];
  is_active: boolean;
  last_sent_at: string | null;
  created_at: string;
}

const ALL_DAYS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
const DAY_LABELS: Record<string, string> = {
  lun: "L", mar: "M", mer: "M", jeu: "J", ven: "V", sam: "S", dim: "D",
};

const SUGGESTIONS = [
  { label: "🌅 Se peser", time: "07:00", days: ALL_DAYS },
  { label: "💊 Compléments matin", time: "08:00", days: ALL_DAYS },
  { label: "🥗 Logger nutrition", time: "21:00", days: ALL_DAYS },
  { label: "💊 Compléments soir", time: "21:30", days: ALL_DAYS },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function checkPushSubscription(userId: string): Promise<boolean> {
  const supabase = createClientSupabase();
  const { data } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

async function requestPushPermission(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ).buffer as ArrayBuffer,
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });

    return true;
  } catch { return false; }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// ── Day pills selector ────────────────────────────────────────────────────────

function DayPills({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (days: string[]) => void;
}) {
  const toggle = (day: string) => {
    if (selected.includes(day)) {
      if (selected.length === 1) return; // keep at least 1
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day].sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b)));
    }
  };

  return (
    <div style={{ display: "flex", gap: 6 }}>
      {ALL_DAYS.map((day) => {
        const active = selected.includes(day);
        return (
          <button
            key={day}
            type="button"
            onClick={() => toggle(day)}
            className="ep-press"
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: `1px solid ${active ? "#E01E1E" : "rgba(224,30,30,0.15)"}`,
              background: active ? "rgba(224,30,30,0.15)" : "rgba(0,0,0,0.3)",
              color: active ? "#E01E1E" : "rgba(245,237,237,0.3)",
              fontWeight: 700,
              fontSize: 11,
              cursor: "pointer",
              transition: "background 0.15s, border-color 0.15s, color 0.15s, transform 0.12s var(--ep-ease-out)",
            }}
          >
            {DAY_LABELS[day]}
          </button>
        );
      })}
    </div>
  );
}

// ── Reminder form (create / edit) ─────────────────────────────────────────────

interface FormState {
  label: string;
  time: string;
  days: string[];
}

function ReminderForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: FormState;
  onSave: (data: FormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [time, setTime]   = useState(initial?.time ?? "08:00");
  const [days, setDays]   = useState<string[]>(initial?.days ?? ALL_DAYS);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(224,30,30,0.15)",
    borderRadius: 8,
    color: "#F5EDED",
    padding: "10px 14px",
    fontFamily: "var(--font-montserrat,'Montserrat'),sans-serif",
    fontWeight: 500,
    fontSize: 14,
    outline: "none",
  };

  return (
    <div style={{
      background: "linear-gradient(135deg,#1A0101 0%,#0D0000 100%)",
      border: "1px solid rgba(224,30,30,0.25)",
      borderRadius: 14,
      padding: 20,
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Label */}
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.7)", display: "block", marginBottom: 8 }}>
            Nom du rappel
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Logger ma nutrition, Me peser…"
            style={inputStyle}
          />
        </div>

        {/* Time */}
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.7)", display: "block", marginBottom: 8 }}>
            Heure
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={{ ...inputStyle, width: "auto", minWidth: 130 }}
          />
        </div>

        {/* Days */}
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.7)", display: "block", marginBottom: 8 }}>
            Jours
          </label>
          <DayPills selected={days} onChange={setDays} />
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={() => {
              if (!label.trim() || !time) return;
              onSave({ label: label.trim(), time, days });
            }}
            disabled={saving || !label.trim()}
            className="ep-btn-primary"
            style={{ flex: 1, height: 42, fontSize: 12 }}
          >
            {saving ? "Sauvegarde…" : initial ? "Modifier" : "Créer le rappel"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Annuler"
            className="ep-btn-secondary"
            style={{ height: 42, padding: "0 16px" }}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reminder card ─────────────────────────────────────────────────────────────

function ReminderCard({
  reminder,
  onToggle,
  onDelete,
  onEdit,
}: {
  reminder: Reminder;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      style={{
        background: "linear-gradient(135deg,#1A0101 0%,#0D0000 100%)",
        border: `1px solid ${reminder.is_active ? "rgba(224,30,30,0.2)" : "rgba(245,237,237,0.06)"}`,
        borderRadius: 14,
        padding: 16,
        opacity: reminder.is_active ? 1 : 0.55,
        transition: "border-color 0.2s, opacity 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Bell icon */}
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: reminder.is_active ? "rgba(224,30,30,0.1)" : "rgba(245,237,237,0.04)",
          border: `1px solid ${reminder.is_active ? "rgba(224,30,30,0.2)" : "rgba(245,237,237,0.06)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          {reminder.is_active
            ? <Bell size={17} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
            : <BellOff size={17} style={{ color: "rgba(245,237,237,0.2)" }} strokeWidth={1.8} />
          }
        </div>

        {/* Content — un vrai <button> plutôt qu'un <div onClick> :
            MASTERCLASS.md Axe C, c'était la seule façon d'ouvrir l'édition
            au clavier/lecteur d'écran (le toggle et la suppression à côté
            sont déjà de vrais boutons, celui-ci ne l'était pas). */}
        <button
          type="button"
          onClick={onEdit}
          style={{
            flex: 1, minWidth: 0, cursor: "pointer",
            background: "none", border: "none", padding: 0, margin: 0,
            textAlign: "left", font: "inherit", color: "inherit",
          }}
        >
          <p style={{ fontWeight: 700, fontSize: 15, color: "#F5EDED", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
            {reminder.label}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#E01E1E" }}>{reminder.time}</span>
            <div style={{ display: "flex", gap: 3 }}>
              {ALL_DAYS.map((day) => {
                const active = reminder.days.includes(day);
                return (
                  <span key={day} style={{
                    width: 22, height: 22,
                    borderRadius: 5,
                    background: active ? "rgba(224,30,30,0.15)" : "rgba(245,237,237,0.04)",
                    color: active ? "#E01E1E" : "rgba(245,237,237,0.2)",
                    fontSize: 9, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {DAY_LABELS[day]}
                  </span>
                );
              })}
            </div>
          </div>
        </button>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {/* Toggle */}
          <button
            onClick={onToggle}
            title={reminder.is_active ? "Désactiver" : "Activer"}
            aria-label={reminder.is_active ? "Désactiver" : "Activer"}
            className="ep-press"
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: reminder.is_active ? "rgba(74,222,128,0.1)" : "rgba(245,237,237,0.04)",
              border: `1px solid ${reminder.is_active ? "rgba(74,222,128,0.2)" : "rgba(245,237,237,0.06)"}`,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s, border-color 0.15s, transform 0.12s var(--ep-ease-out)",
            }}
          >
            <Check size={14} style={{ color: reminder.is_active ? "#4ade80" : "rgba(245,237,237,0.2)" }} strokeWidth={2.5} />
          </button>

          {/* Delete */}
          {confirmDelete ? (
            <button
              onClick={onDelete}
              style={{
                height: 36, padding: "0 12px", borderRadius: 8,
                background: "rgba(224,30,30,0.15)",
                border: "1px solid rgba(224,30,30,0.3)",
                color: "#E01E1E", fontSize: 11, fontWeight: 700,
                cursor: "pointer", letterSpacing: "0.05em", textTransform: "uppercase",
              }}
              onBlur={() => setConfirmDelete(false)}
            >
              Confirmer
            </button>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                width: 36, height: 36, borderRadius: 8,
                background: "transparent",
                border: "1px solid rgba(245,237,237,0.06)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Trash2 size={14} style={{ color: "rgba(245,237,237,0.25)" }} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RemindersView() {
  const router = useRouter();
  const [reminders, setReminders]     = useState<Reminder[]>([]);
  const [loading, setLoading]         = useState(true);
  const [userId, setUserId]           = useState<string | null>(null);
  const [hasPush, setHasPush]         = useState<boolean | null>(null);
  const [showForm, setShowForm]       = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [requestingPush, setRequestingPush] = useState(false);

  const supabase = createClientSupabase();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/client");
        return;
      }
      setUserId(user.id);

      const [{ data: rems }, pushOk] = await Promise.all([
        supabase.from("reminders").select("*").eq("client_id", user.id).order("created_at"),
        checkPushSubscription(user.id),
      ]);

      setReminders((rems as Reminder[]) ?? []);
      setHasPush(pushOk);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(data: { label: string; time: string; days: string[] }) {
    if (!userId) return;
    setSaving(true);
    const { data: rem } = await supabase
      .from("reminders")
      .insert({ client_id: userId, ...data })
      .select()
      .single();
    if (rem) setReminders((prev) => [...prev, rem as Reminder]);
    setShowForm(false);
    setSaving(false);
  }

  async function handleEdit(id: string, data: { label: string; time: string; days: string[] }) {
    setSaving(true);
    const { data: rem } = await supabase
      .from("reminders")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (rem) setReminders((prev) => prev.map((r) => (r.id === id ? (rem as Reminder) : r)));
    setEditingId(null);
    setSaving(false);
  }

  async function handleToggle(id: string, current: boolean) {
    await supabase.from("reminders").update({ is_active: !current }).eq("id", id);
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active: !current } : r))
    );
  }

  async function handleDelete(id: string) {
    await supabase.from("reminders").delete().eq("id", id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleRequestPush() {
    if (!userId) return;
    setRequestingPush(true);
    const ok = await requestPushPermission();
    setHasPush(ok);
    setRequestingPush(false);
  }

  function applysuggestion(s: typeof SUGGESTIONS[0]) {
    setShowForm(true);
    setEditingId(null);
    // Small trick: use a custom event to pre-fill (handled inside form via initial prop)
    // Actually we'll use a suggestion state
    setSuggestion(s);
  }

  const [suggestion, setSuggestion] = useState<typeof SUGGESTIONS[0] | null>(null);

  if (loading) {
    return (
      <div style={{ padding: "32px 20px", maxWidth: 600, margin: "0 auto" }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="ep-skeleton" style={{ height: 80, borderRadius: 14, marginBottom: 12 }} />
        ))}
      </div>
    );
  }

  return (
    <div className="page-transition" style={{ padding: "24px 20px 80px", maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.6)", margin: "0 0 4px" }}>
            Notifications
          </p>
          <h1 className="ep-h1" style={{ fontSize: 28 }}>Mes rappels</h1>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setSuggestion(null); setEditingId(null); }}
            className="ep-btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
          >
            <Plus size={14} />
            Nouveau rappel
          </button>
        )}
      </div>

      {/* Push permission banner */}
      {hasPush === false && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          background: "rgba(251,191,36,0.08)",
          border: "1px solid rgba(251,191,36,0.2)",
          borderRadius: 12,
          marginBottom: 20,
        }}>
          <AlertCircle size={16} style={{ color: "#fbbf24", flexShrink: 0 }} strokeWidth={2} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24", margin: "0 0 2px" }}>
              Active les notifications
            </p>
            <p style={{ fontSize: 11, color: "rgba(245,237,237,0.4)", margin: 0 }}>
              Pour recevoir tes rappels sur ton téléphone.
            </p>
          </div>
          <button
            onClick={handleRequestPush}
            disabled={requestingPush}
            style={{
              padding: "8px 14px",
              background: "rgba(251,191,36,0.15)",
              border: "1px solid rgba(251,191,36,0.3)",
              borderRadius: 8,
              color: "#fbbf24",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {requestingPush ? "…" : "Activer"}
          </button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <ReminderForm
          initial={suggestion ? { label: suggestion.label, time: suggestion.time, days: suggestion.days } : undefined}
          onSave={handleCreate}
          onCancel={() => { setShowForm(false); setSuggestion(null); }}
          saving={saving}
        />
      )}

      {/* Edit form */}
      {editingId && !showForm && (() => {
        const rem = reminders.find((r) => r.id === editingId);
        if (!rem) return null;
        return (
          <ReminderForm
            initial={{ label: rem.label, time: rem.time, days: rem.days }}
            onSave={(data) => handleEdit(editingId, data)}
            onCancel={() => setEditingId(null)}
            saving={saving}
          />
        );
      })()}

      {/* Reminder list */}
      {reminders.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reminders.map((rem) =>
            editingId === rem.id ? null : (
              <ReminderCard
                key={rem.id}
                reminder={rem}
                onToggle={() => handleToggle(rem.id, rem.is_active)}
                onDelete={() => handleDelete(rem.id)}
                onEdit={() => { setEditingId(rem.id); setShowForm(false); }}
              />
            )
          )}
        </div>
      ) : !showForm ? (
        /* Suggestions */
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,237,237,0.25)", margin: "0 0 12px" }}>
            Rappels recommandés
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => applysuggestion(s)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  background: "linear-gradient(135deg,#1A0101 0%,#0D0000 100%)",
                  border: "1px solid rgba(224,30,30,0.1)",
                  borderRadius: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "border-color 0.15s",
                  width: "100%",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(224,30,30,0.3)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(224,30,30,0.1)"; }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: "#F5EDED" }}>{s.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#E01E1E" }}>{s.time}</span>
                  <Plus size={14} style={{ color: "rgba(245,237,237,0.25)" }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
