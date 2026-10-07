"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Target, HelpCircle } from "lucide-react";
import { saveAccountEntryAction, saveGoalAction } from "@/app/dashboard/coach/stats-reseaux/actions";

// Saisie des chiffres d'un compte (abonnés, vues, portée...) par le coach
// lui-même, en 1 minute par semaine. Chaque champ est optionnel : on met
// ce que la plateforme affiche, rien n'est inventé.

const LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  threads: "Threads",
};

// Où trouver les chiffres dans chaque appli.
const WHERE: Record<string, string> = {
  instagram: "Profil > Tableau de bord professionnel > Statistiques du compte.",
  tiktok: "Profil > menu > Outils de créateur (ou TikTok Studio) > Statistiques.",
  youtube: "YouTube Studio > Statistiques > Présentation.",
  facebook: "Meta Business Suite > Statistiques > Présentation.",
  linkedin: "Ton profil > Statistiques (impressions, abonnés, vues du profil).",
  threads: "Profil > Statistiques.",
};

type Field = { key: string; label: string; hint?: string };

function fieldsFor(platform: string): Field[] {
  const base: Field[] = [
    { key: "followers", label: "Abonnés au total" },
    { key: platform === "linkedin" ? "impressions" : "views", label: platform === "linkedin" ? "Impressions" : "Vues" },
    { key: "reach", label: platform === "youtube" ? "Spectateurs uniques" : "Comptes touchés (portée)" },
    { key: "profileViews", label: "Visites du profil" },
    { key: "likes", label: "J'aime" },
    { key: "comments", label: "Commentaires" },
    { key: "shares", label: "Partages" },
  ];
  if (platform === "instagram" || platform === "tiktok" || platform === "facebook") base.push({ key: "saves", label: "Enregistrements" });
  if (platform === "youtube" || platform === "tiktok") base.push({ key: "watchMinutes", label: "Durée regardée", hint: "en minutes" });
  base.push({ key: "clicks", label: "Clics sur le lien" });
  return base;
}

const input: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(137,4,4,0.35)",
  borderRadius: 10,
  padding: "9px 10px",
  fontSize: 14,
  color: "#F5EDED",
  outline: "none",
};

const lbl: React.CSSProperties = { display: "block", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.45)", marginBottom: 4 };

function chip(active: boolean): React.CSSProperties {
  return {
    padding: "7px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    border: `1px solid ${active ? "rgba(224,30,30,0.6)" : "rgba(137,4,4,0.35)"}`,
    background: active ? "rgba(224,30,30,0.15)" : "transparent",
    color: active ? "#ff6b6b" : "rgba(245,237,237,0.6)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

export default function AccountEntryForm({
  platforms,
  today,
  handles,
  goals,
}: {
  platforms: string[];
  today: string;
  handles: Record<string, string | null>;
  goals: Record<string, { followers: number; date: string | null } | null>;
}) {
  const t = useT();
  const router = useRouter();
  const [platform, setPlatform] = useState(platforms[0] ?? "instagram");
  const [date, setDate] = useState(today);
  const [period, setPeriod] = useState(7);
  const [handle, setHandle] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(handles).map(([k, v]) => [k, v ?? ""])));
  const [values, setValues] = useState<Record<string, string>>({});
  const [goal, setGoal] = useState<Record<string, { followers: string; date: string }>>(() =>
    Object.fromEntries(Object.entries(goals).map(([k, g]) => [k, { followers: g ? String(g.followers) : "", date: g?.date ?? "" }]))
  );
  const [showGoal, setShowGoal] = useState(false);
  const [showWhere, setShowWhere] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const fields = fieldsFor(platform);
  const g = goal[platform] ?? { followers: "", date: "" };

  function save() {
    setMsg(null);
    start(async () => {
      const res = await saveAccountEntryAction({ platform, date, periodDays: period, handle: handle[platform] || null, ...values });
      if (res.error) return setMsg({ ok: false, text: res.error });
      setValues({});
      setMsg({ ok: true, text: "Chiffres enregistrés." });
      router.refresh();
    });
  }

  function saveGoal() {
    setMsg(null);
    start(async () => {
      const res = await saveGoalAction({ platform, goalFollowers: g.followers || null, goalDate: g.date || null, handle: handle[platform] || null });
      if (res.error) return setMsg({ ok: false, text: res.error });
      setMsg({ ok: true, text: "Objectif enregistré." });
      setShowGoal(false);
      router.refresh();
    });
  }

  return (
    <div className="ep-card" style={{ padding: "16px 16px" }}>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12 }} className="no-scrollbar">
        {platforms.map((p) => (
          <button key={p} type="button" onClick={() => { setPlatform(p); setValues({}); setMsg(null); }} style={chip(platform === p)}>
            {LABELS[p] ?? p}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <label style={lbl}>{t("Ton compte")}</label>
          <input style={input} value={handle[platform] ?? ""} onChange={(e) => setHandle((h) => ({ ...h, [platform]: e.target.value }))} placeholder={t("@toncompte")} aria-label={t("Nom du compte")} />
        </div>
        <div>
          <label style={lbl}>{t("Chiffres au")}</label>
          <input type="date" style={input} value={date} max={today} onChange={(e) => setDate(e.target.value)} aria-label={t("Date des chiffres")} />
        </div>
      </div>

      <label style={lbl}>{t("Les vues, portée et interactions portent sur")}</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { v: 1, l: "Ce jour" },
          { v: 7, l: "Les 7 derniers jours" },
          { v: 30, l: "Les 30 derniers jours" },
        ].map((o) => (
          <button key={o.v} type="button" onClick={() => setPeriod(o.v)} style={chip(period === o.v)}>
            {o.l}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
        {fields.map((f) => (
          <div key={f.key}>
            <label style={lbl}>
              {f.label}
              {f.hint ? <span style={{ textTransform: "none", fontWeight: 600, color: "rgba(245,237,237,0.3)" }}> ({f.hint})</span> : null}
            </label>
            <input
              style={input}
              inputMode="numeric"
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              placeholder="-"
              aria-label={f.label}
            />
          </div>
        ))}
      </div>

      <button type="button" onClick={() => setShowWhere((v) => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10, background: "none", border: "none", padding: 0, color: "rgba(245,237,237,0.5)", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
        <HelpCircle size={13} />{" "}{t("Où trouver ces chiffres ?")}
      </button>
      {showWhere && <p style={{ fontSize: 12, color: "rgba(245,237,237,0.65)", margin: "6px 0 0", lineHeight: 1.6 }}>{WHERE[platform]}{" "}{t("Mets seulement ce que tu vois, laisse vide le reste.")}</p>}

      {msg && <p style={{ fontSize: 12, color: msg.ok ? "#4ade80" : "#fca5a5", margin: "10px 0 0", display: "flex", alignItems: "center", gap: 5 }}>{msg.ok && <Check size={13} />} {msg.text}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <button type="button" disabled={pending} onClick={save} style={{ flex: 1, minWidth: 160, padding: "12px 14px", borderRadius: 12, border: "none", background: "#E01E1E", color: "#fff", fontSize: 12.5, fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer", opacity: pending ? 0.6 : 1 }}>
          {pending ? "..." : `Enregistrer ${LABELS[platform] ?? ""}`}
        </button>
        <button type="button" onClick={() => setShowGoal((v) => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(137,4,4,0.45)", background: "transparent", color: "rgba(245,237,237,0.75)", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
          <Target size={14} />{" "}{t("Objectif")}
        </button>
      </div>

      {showGoal && (
        <div style={{ marginTop: 12, padding: "12px", borderRadius: 12, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(137,4,4,0.25)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>{t("Abonnés visés")}</label>
              <input style={input} inputMode="numeric" value={g.followers} onChange={(e) => setGoal((all) => ({ ...all, [platform]: { ...g, followers: e.target.value } }))} placeholder="10000" aria-label={t("Abonnés visés")} />
            </div>
            <div>
              <label style={lbl}>{t("Pour le")}</label>
              <input type="date" style={input} value={g.date} min={today} onChange={(e) => setGoal((all) => ({ ...all, [platform]: { ...g, date: e.target.value } }))} aria-label={t("Date visée")} />
            </div>
          </div>
          <button type="button" disabled={pending} onClick={saveGoal} style={{ marginTop: 10, width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(224,30,30,0.6)", background: "rgba(224,30,30,0.12)", color: "#F5EDED", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
            {t("Enregistrer l'objectif")}
          </button>
        </div>
      )}
    </div>
  );
}
