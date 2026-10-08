"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Utensils, Dumbbell, ClipboardCheck, Footprints, ShoppingBasket, Lightbulb, Trophy, Medal, Camera, Heart,
  Activity, HeartPulse, MessageCircle, CalendarDays, NotebookPen, Sparkles, AlertTriangle, Inbox, ListChecks,
  PenLine, Video, Layers, BarChart3, Megaphone, Share2, Crosshair, Radio, Search, X, LayoutGrid, ChevronRight,
} from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { fuzzyMatchAny } from "@/lib/fuzzy-search";
import { rankIntents, type Intent, type IntentSpace } from "@/lib/intents";

const ICONS: Record<string, React.ElementType> = {
  utensils: Utensils, dumbbell: Dumbbell, clipboard: ClipboardCheck, footprints: Footprints, basket: ShoppingBasket,
  lightbulb: Lightbulb, trophy: Trophy, medal: Medal, camera: Camera, heart: Heart, activity: Activity, heartpulse: HeartPulse,
  message: MessageCircle, calendar: CalendarDays, note: NotebookPen, sparkles: Sparkles, alert: AlertTriangle, inbox: Inbox,
  tasks: ListChecks, pen: PenLine, video: Video, layers: Layers, chart: BarChart3, megaphone: Megaphone, share: Share2,
  target: Crosshair, live: Radio,
};

// Usage par appareil : sert seulement à faire remonter ce que la personne
// touche le plus. Rien de sensible, pas besoin du compte.
const KEY = "ep-intent-usage-v1";
type Usage = Record<string, { n: number; last: number }>;
const EMPTY: Usage = {};
let cacheRaw: string | null = null;
let cache: Usage = EMPTY;
function readUsage(): Usage {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== cacheRaw) {
      cacheRaw = raw;
      cache = raw ? (JSON.parse(raw) as Usage) : EMPTY;
    }
  } catch {}
  return cache;
}
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("ep:intent-usage", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("ep:intent-usage", cb);
  };
}
function recordUse(id: string) {
  try {
    const u = { ...readUsage() };
    u[id] = { n: (u[id]?.n ?? 0) + 1, last: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(u));
    window.dispatchEvent(new Event("ep:intent-usage"));
  } catch {}
}

export interface LauncherIntent {
  id: string;
  label: string;
  icon: string;
  href: string;
  keywords: string;
}

export default function IntentLauncher({ intents, focus, hints, space, count = 6 }: { intents: LauncherIntent[]; focus: string[]; hints: Record<string, string>; space: IntentSpace; count?: number }) {
  const t = useT();
  const usage = useSyncExternalStore(subscribe, readUsage, () => EMPTY);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const ranked = useMemo(() => {
    const asIntents = intents.map((i) => ({ ...i, href: { client: i.href, coach: i.href } }) as unknown as Intent);
    // Date figée par rendu : le classement ne bouge pas pendant qu'on regarde.
    const now = usage === EMPTY ? 0 : Date.now();
    return rankIntents(asIntents, focus, usage, now).map((i) => intents.find((x) => x.id === i.id)!);
  }, [intents, focus, usage]);

  const top = ranked.slice(0, count);
  const filtered = q.trim() ? ranked.filter((i) => fuzzyMatchAny([t(i.label), i.label, i.keywords], q)) : ranked;

  return (
    <section aria-label={t("Je veux")} style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <p className="ep-label" style={{ margin: 0 }}>{t("Je veux")}</p>
        <button type="button" onClick={() => setOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "rgba(245,237,237,0.55)", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "6px 2px", minHeight: 32 }}>
          <LayoutGrid size={13} /> {t("Tout")}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        {top.map((i) => (
          <Tile key={i.id} intent={i} hint={hints[i.id]} label={t(i.label)} onUse={() => recordUse(i.id)} />
        ))}
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={t("Tout ce que tu peux faire")} onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "86vh", overflowY: "auto", background: "#160101", border: "1px solid rgba(137,4,4,0.4)", borderRadius: "18px 18px 0 0", padding: "14px 14px calc(18px + env(safe-area-inset-bottom))" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "rgba(245,237,237,0.4)" }} />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Je veux... (manger, séance, stats, carrousel)")} aria-label={t("Chercher ce que je veux faire")} className="ep-input" style={{ width: "100%", paddingLeft: 34 }} />
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label={t("Fermer")} style={{ width: 40, height: 40, background: "none", border: "none", color: "rgba(245,237,237,0.6)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {filtered.map((i) => {
                const Icon = ICONS[i.icon] ?? Sparkles;
                return (
                  <Link key={i.id} href={i.href} onClick={() => { recordUse(i.id); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 8px", minHeight: 52, borderRadius: 12, textDecoration: "none", color: "#F5EDED" }}>
                    <span style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(224,30,30,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={16} style={{ color: "#E01E1E" }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{t(i.label)}</span>
                      {hints[i.id] && <span style={{ display: "block", fontSize: 11.5, color: "rgba(245,237,237,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{hints[i.id]}</span>}
                    </span>
                    <ChevronRight size={15} style={{ color: "rgba(245,237,237,0.25)" }} />
                  </Link>
                );
              })}
              {filtered.length === 0 && <p style={{ fontSize: 13, color: "rgba(245,237,237,0.5)", textAlign: "center", padding: 18 }}>{t("Rien ne correspond. Essaie la loupe en haut.")}</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Tile({ intent, hint, label, onUse }: { intent: LauncherIntent; hint?: string; label: string; onUse: () => void }) {
  const Icon = ICONS[intent.icon] ?? Sparkles;
  return (
    <Link
      href={intent.href}
      onClick={onUse}
      className="ep-card ep-press"
      style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 12px", minHeight: 92, textDecoration: "none", color: "#F5EDED" }}
    >
      <span style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(224,30,30,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={15} style={{ color: "#E01E1E" }} />
      </span>
      <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.25 }}>{label}</span>
      {hint && <span style={{ fontSize: 11, color: "rgba(245,237,237,0.55)", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{hint}</span>}
    </Link>
  );
}
