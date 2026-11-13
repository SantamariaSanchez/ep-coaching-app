import Link from "next/link";
import { Sparkles, CalendarClock, Video, MessageCircle, ArrowRight } from "lucide-react";
import { withAlpha } from "@/lib/theme-color";
// Réexporté pour compatibilité (lib/dates.ts porte la logique).
export { timeAwareGreeting } from "@/lib/dates";

// Accueil coach épuré (audit utilisateur 2026-11-13) : agenda, messages,
// anneau nutrition (kcal + macros) et deux accès visuels. Plus de titre,
// d'astuce du jour, de sommeil, de pas ni de bloc live en double.

interface UnreadPreview {
  id: string;
  /** Id du client (= id de conversation, une conversation par membre). */
  clientId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface MacroDay {
  kcal: number;
  kcalTarget: number | null;
  proteins: number;
  proteinsTarget: number | null;
  carbs: number;
  carbsTarget: number | null;
  fats: number;
  fatsTarget: number | null;
}

export interface MyDayCardProps {
  currentBlock: { label: string; endTime: string } | null;
  nextBlock: { label: string; startTime: string } | null;
  unreadPreview: UnreadPreview[];
  unreadTotal: number;
  nutrition: MacroDay | null;
  hasUpcomingLive: boolean;
}

function Tile({
  icon: Icon, accent, value, sub, microSub, href, ariaLabel,
}: {
  icon: React.ElementType; accent: string; value: string; sub: string; microSub?: string; href: string; ariaLabel: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="ep-press"
      style={{
        display: "flex", flexDirection: "column", gap: 6, padding: "12px 14px",
        borderRadius: "var(--radius-lg)",
        background: "linear-gradient(160deg, var(--ep-s2) 0%, var(--ep-bg) 100%)",
        border: `1px solid ${withAlpha(accent, "22")}`, textDecoration: "none", minWidth: 0,
      }}
    >
      <Icon size={15} strokeWidth={2} style={{ color: accent }} />
      <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "var(--ep-ink)", letterSpacing: "-0.02em", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
      </p>
      <p style={{ margin: 0, fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.5)" }}>{sub}</p>
      {microSub && <p style={{ margin: 0, fontSize: 10, color: "rgba(var(--ep-ink-rgb),0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{microSub}</p>}
    </Link>
  );
}

const pct = (v: number, t: number | null) => (t && t > 0 ? Math.min(1, Math.max(0, v / t)) : 0);

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number | null; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 800 }}>
        <span style={{ color }}>{label}</span>
        <span style={{ color: "rgba(var(--ep-ink-rgb),0.6)", fontVariantNumeric: "tabular-nums" }}>
          {Math.round(value)}{target ? ` / ${Math.round(target)}` : ""} g
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "rgba(var(--ep-ink-rgb),0.07)", overflow: "hidden" }}>
        <div style={{ width: `${pct(value, target) * 100}%`, height: "100%", borderRadius: 999, background: color }} />
      </div>
    </div>
  );
}

function NutritionRing({ n }: { n: MacroDay }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const p = pct(n.kcal, n.kcalTarget);
  const restant = n.kcalTarget ? Math.max(0, Math.round(n.kcalTarget - n.kcal)) : null;
  return (
    <Link
      href="/dashboard/coach/moi/nutrition"
      aria-label={`Nutrition : ${Math.round(n.kcal)} kcal${n.kcalTarget ? ` sur ${n.kcalTarget}` : ""}`}
      className="ep-press"
      style={{
        display: "flex", alignItems: "center", gap: 18, padding: "14px 16px", marginBottom: 10,
        borderRadius: "var(--radius-lg)", background: "linear-gradient(160deg, var(--ep-s2) 0%, var(--ep-bg) 100%)",
        border: `1px solid ${withAlpha("var(--ep-ok)", "22")}`, textDecoration: "none",
      }}
    >
      <div style={{ position: "relative", width: 104, height: 104, flexShrink: 0 }}>
        <svg width={104} height={104} viewBox="0 0 104 104" style={{ transform: "rotate(-90deg)" }} aria-hidden>
          <circle cx={52} cy={52} r={r} fill="none" stroke="rgba(var(--ep-ink-rgb),0.08)" strokeWidth={10} />
          <circle cx={52} cy={52} r={r} fill="none" stroke="var(--ep-ok)" strokeWidth={10} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: "var(--ep-ink)", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{Math.round(n.kcal)}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.5)" }}>
            {restant != null ? `${restant} restantes` : "kcal"}
          </span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <MacroBar label="Protéines" value={n.proteins} target={n.proteinsTarget} color="var(--ep-accent)" />
        <MacroBar label="Glucides" value={n.carbs} target={n.carbsTarget} color="var(--ep-orange)" />
        <MacroBar label="Lipides" value={n.fats} target={n.fatsTarget} color="var(--ep-info)" />
      </div>
    </Link>
  );
}

export default function MyDayCard({ currentBlock, nextBlock, unreadPreview, unreadTotal, nutrition, hasUpcomingLive }: MyDayCardProps) {
  const agendaValue = currentBlock ? currentBlock.label : nextBlock ? nextBlock.label : "Rien de prévu";
  const agendaSub = currentBlock
    ? `jusqu'à ${currentBlock.endTime.slice(0, 5)}`
    : nextBlock ? `à ${nextBlock.startTime.slice(0, 5)}` : "journée libre";
  const agendaMicroSub = currentBlock && nextBlock ? `puis ${nextBlock.label} à ${nextBlock.startTime.slice(0, 5)}` : undefined;
  const unreadValue = unreadTotal > 0 ? `${unreadTotal} ${unreadTotal > 1 ? "non lus" : "non lu"}` : "Tout lu";

  return (
    <section className="animate-fade-up" style={{ marginBottom: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 10 }}>
        <Tile icon={CalendarClock} accent="var(--ep-orange)" value={agendaValue} sub={agendaSub} microSub={agendaMicroSub} href="/dashboard/coach/moi/agenda" ariaLabel={`Agenda : ${agendaValue}, ${agendaSub}`} />
        <Tile icon={MessageCircle} accent="var(--ep-accent)" value={unreadValue} sub="messages" href="/dashboard/coach/messages" ariaLabel={`Messages : ${unreadValue}`} />
      </div>

      {unreadPreview.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {unreadPreview.slice(0, 2).map((m) => (
            <Link
              key={m.id}
              href={`/dashboard/coach/messages/${m.clientId}`}
              className="ep-press"
              style={{
                display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: "6px 12px", borderRadius: 10,
                background: "var(--ep-s2)", border: "1px solid rgba(var(--ep-line-rgb),0.25)", textDecoration: "none",
              }}
            >
              <MessageCircle size={13} style={{ color: "var(--ep-accent)", flexShrink: 0 }} strokeWidth={1.8} />
              <p style={{ margin: 0, fontSize: 12, color: "var(--ep-ink)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <strong style={{ fontWeight: 800 }}>{m.senderName}</strong>
                {" · "}
                <span style={{ color: "rgba(var(--ep-ink-rgb),0.55)" }}>{m.content}</span>
              </p>
              <ArrowRight size={12} style={{ color: "rgba(var(--ep-ink-rgb),0.3)", flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      )}

      {nutrition && <NutritionRing n={nutrition} />}

      {/* Deux accès, icônes d'abord. */}
      <div style={{ display: "flex", gap: 10 }}>
        <Link
          href="/dashboard/coach/studio"
          className="ep-press"
          style={{
            flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 52,
            borderRadius: "var(--radius-lg)", background: "rgba(var(--ep-accent-rgb),0.08)",
            border: "1px solid rgba(var(--ep-accent-rgb),0.2)", color: "var(--ep-ink)", fontSize: 13, fontWeight: 800, textDecoration: "none",
          }}
        >
          <Sparkles size={17} style={{ color: "var(--ep-accent)" }} /> Studio
        </Link>
        <Link
          href="/dashboard/coach/live"
          aria-label="Lives"
          className="ep-press"
          style={{
            position: "relative", width: 52, minHeight: 52, display: "inline-flex", alignItems: "center", justifyContent: "center",
            borderRadius: "var(--radius-lg)", background: withAlpha("var(--ep-violet)", "14"),
            border: `1px solid ${withAlpha("var(--ep-violet)", "33")}`, color: "var(--ep-violet)",
          }}
        >
          <Video size={20} />
          {hasUpcomingLive && <span aria-hidden style={{ position: "absolute", top: 9, right: 9, width: 8, height: 8, borderRadius: 999, background: "var(--ep-accent)" }} />}
        </Link>
      </div>
    </section>
  );
}
