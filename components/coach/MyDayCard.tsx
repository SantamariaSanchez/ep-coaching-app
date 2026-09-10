import Link from "next/link";
import {
  Sparkles, Apple, Moon, CalendarClock, Video, MessageCircle,
  LayoutTemplate, CalendarDays, ArrowRight, Mail, Backpack, ExternalLink, Footprints,
} from "lucide-react";
import type { SessionAccessory } from "@/lib/session-accessories";

// Section "Ma journée" — idées #1 à #8 de la passe "onglet Aujourd'hui"
// (2026-09-09, retour direct "au moins 20 idées") : jusqu'ici, le tableau de
// bord ne parlait que de gestion clients, rien de personnel pour un coach
// qui s'entraîne et se suit lui-même au quotidien (voir Moi > Nutrition,
// Sommeil, Agenda déjà largement utilisés). Regroupe en un coup d'oeil ce
// qu'il se passe AUJOURD'HUI pour lui, avant de descendre vers la gestion
// de ses clients.
//
// Chaque mini-carte a sa propre teinte d'accent (retour direct 2026-09-09 :
// "diversifie [les couleurs] un peu pas tout mais a different endroit") —
// appliqué ici précisément, pas partout dans l'appli.

interface UnreadPreview {
  id: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface MyDayCardProps {
  tip: string;
  nutrition: { logged: number; target: number | null } | null;
  sleepHours: number | null;
  nextBlock: { label: string; startTime: string } | null;
  nextLive: { title: string; startsAt: string } | null;
  unreadPreview: UnreadPreview[];
  /** Nom de la séance du jour, déduit de l'agenda ("Push", "Legs / Biceps"...), null si jour off. */
  todaySeanceLabel: string | null;
  /** Accessoires à prévoir pour la séance du jour (lib/session-accessories.ts). */
  todayAccessories: SessionAccessory[];
  /** Pas du jour — actual = null tant qu'aucune source (Oura, manuel) n'a rien remonté. */
  steps: { actual: number | null; goal: number };
}

// Idée #1 : salutation adaptée à l'heure plutôt que "Bonjour" fixe toute la
// journée. Exportée pour être réutilisée par le header de la page.
export function timeAwareGreeting(hour: number): string {
  if (hour < 5) return "Bonne nuit";
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

function MiniCard({
  icon: Icon,
  accent,
  label,
  value,
  sub,
  href,
  delay = 0,
}: {
  icon: React.ElementType;
  accent: string;
  label: string;
  value: string;
  sub: string;
  href: string;
  delay?: number;
}) {
  return (
    <Link
      href={href}
      aria-label={`${label} : ${value}, ${sub}`}
      className="animate-fade-up ep-press"
      style={{
        animationDelay: `${delay}ms`,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "14px 16px",
        borderRadius: "var(--radius-lg)",
        background: "linear-gradient(160deg, #150000 0%, #0d0000 100%)",
        border: `1px solid ${accent}22`,
        textDecoration: "none",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: accent }}>
        <Icon size={13} strokeWidth={2} />
        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: "rgba(245,237,237,0.4)" }}>
          {label}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "#F5EDED", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
        {value}
      </p>
      <p style={{ margin: 0, fontSize: 10.5, color: "rgba(245,237,237,0.35)", lineHeight: 1.3 }}>
        {sub}
      </p>
    </Link>
  );
}

export default function MyDayCard({
  tip,
  nutrition,
  sleepHours,
  nextBlock,
  nextLive,
  unreadPreview,
  todaySeanceLabel,
  todayAccessories,
  steps,
}: MyDayCardProps) {
  const nutritionValue =
    nutrition && nutrition.target
      ? `${Math.round(nutrition.logged)} / ${nutrition.target} kcal`
      : nutrition && nutrition.logged > 0
        ? `${Math.round(nutrition.logged)} kcal`
        : "Rien loggé";
  const nutritionSub =
    nutrition && nutrition.target
      ? nutrition.logged >= nutrition.target
        ? "objectif atteint"
        : `${Math.max(0, Math.round(nutrition.target - nutrition.logged))} kcal restants`
      : "voir Nutrition";

  const sleepValue = sleepHours != null ? `${sleepHours}h` : "···";
  const sleepSub = sleepHours == null ? "pas encore loggé" : sleepHours < 6.5 ? "un peu court" : "correct";

  const agendaValue = nextBlock ? nextBlock.label : "Rien de prévu";
  const agendaSub = nextBlock ? `à ${nextBlock.startTime.slice(0, 5)}` : "journée libre";

  const liveValue = nextLive ? nextLive.title : "Rien de programmé";
  const liveSub = nextLive
    ? new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(nextLive.startsAt))
    : "voir Live";

  const stepsValue = steps.actual != null ? steps.actual.toLocaleString("fr-FR") : "···";
  const stepsSub =
    steps.actual == null
      ? "pas encore remonté"
      : steps.actual >= steps.goal
        ? "objectif atteint"
        : `sur ${steps.goal.toLocaleString("fr-FR")}`;

  return (
    <section className="animate-fade-up" style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <p className="ep-section-title" style={{ margin: 0 }}>Ma journée</p>
        {/* Jour ON/OFF — repère immédiat maintenant que l'agenda a une
            structure fixe et prévisible chaque semaine. */}
        <span
          style={{
            fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
            padding: "3px 9px", borderRadius: 999,
            color: todaySeanceLabel ? "#E01E1E" : "#4ade80",
            background: todaySeanceLabel ? "rgba(224,30,30,0.1)" : "rgba(74,222,128,0.1)",
            border: `1px solid ${todaySeanceLabel ? "rgba(224,30,30,0.25)" : "rgba(74,222,128,0.25)"}`,
          }}
        >
          {todaySeanceLabel ? `Jour ON · ${todaySeanceLabel}` : "Jour OFF"}
        </span>
      </div>

      {/* Astuce du jour — idée #2, stable toute la journée (getTipOfTheDay). */}
      <div
        style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "12px 16px", marginBottom: 14,
          borderRadius: "var(--radius-lg)",
          background: "rgba(224,30,30,0.05)",
          border: "1px solid rgba(224,30,30,0.14)",
        }}
      >
        <Sparkles size={14} style={{ color: "#E01E1E", flexShrink: 0, marginTop: 1 }} strokeWidth={1.8} />
        <p style={{ margin: 0, fontSize: 12, color: "rgba(245,237,237,0.6)", lineHeight: 1.5 }}>
          {tip}
        </p>
      </div>

      {/* Mini-cartes — idées #3 à #6, chacune avec sa propre teinte. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
        <MiniCard icon={Apple} accent="#4ade80" label="Nutrition" value={nutritionValue} sub={nutritionSub} href="/dashboard/coach/moi/nutrition" delay={0} />
        <MiniCard icon={Moon} accent="#60a5fa" label="Sommeil" value={sleepValue} sub={sleepSub} href="/dashboard/coach/moi/tracking" delay={50} />
        <MiniCard icon={CalendarClock} accent="#fb923c" label="Prochain créneau" value={agendaValue} sub={agendaSub} href="/dashboard/coach/moi/agenda" delay={100} />
        <MiniCard icon={Video} accent="#c084fc" label="Prochain live" value={liveValue} sub={liveSub} href="/dashboard/coach/live" delay={150} />
        <MiniCard icon={Footprints} accent="#4ade80" label="Pas" value={stepsValue} sub={stepsSub} href="/dashboard/coach/moi/steps" delay={200} />
      </div>

      {/* "À prévoir" pour la séance du jour — même logique que
          ProgramDaysGrid, mais directement sur le tableau de bord, au
          moment où on planifie sa journée plutôt qu'une fois arrivé à la
          salle. Le nom de séance dans l'agenda ("Séance : Push") correspond
          exactement à un day_label du programme actif, voir
          app/dashboard/coach/page.tsx. */}
      {todaySeanceLabel && todayAccessories.length > 0 && (
        <div
          style={{
            marginBottom: 14, padding: "12px 16px", borderRadius: "var(--radius-lg)",
            background: "rgba(0,0,0,0.3)", border: "1px solid rgba(137,4,4,0.2)",
          }}
        >
          <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: "rgba(245,237,237,0.4)", margin: "0 0 8px" }}>
            <Backpack size={12} /> À prévoir pour {todaySeanceLabel}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {todayAccessories.map((a) => (
              <a
                key={a.accessory}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#F5EDED", textDecoration: "none" }}
              >
                {a.accessory}
                <ExternalLink size={9} style={{ color: "rgba(245,237,237,0.3)" }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Aperçu messages non lus — idée #9. */}
      {unreadPreview.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)", display: "flex", alignItems: "center", gap: 6 }}>
              <Mail size={11} /> Messages non lus
            </p>
            <Link href="/dashboard/coach/messages" style={{ fontSize: 10, fontWeight: 700, color: "#E01E1E", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
              Tout voir <ArrowRight size={10} />
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {unreadPreview.map((m) => (
              <Link
                key={m.id}
                href="/dashboard/coach/messages"
                className="ep-press"
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 10,
                  background: "#150000", border: "1px solid rgba(137,4,4,0.25)",
                  textDecoration: "none",
                }}
              >
                <MessageCircle size={13} style={{ color: "#E01E1E", flexShrink: 0 }} strokeWidth={1.8} />
                <p style={{ margin: 0, fontSize: 11.5, color: "#F5EDED", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <strong style={{ fontWeight: 800 }}>{m.senderName}</strong>
                  {" · "}
                  <span style={{ color: "rgba(245,237,237,0.5)" }}>{m.content}</span>
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Actions rapides — idée #7. */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { label: "Nouveau modèle", icon: LayoutTemplate, href: "/dashboard/coach/programmation" },
          { label: "Messages", icon: MessageCircle, href: "/dashboard/coach/messages" },
          { label: "Studio créatif", icon: Sparkles, href: "/dashboard/coach/studio" },
          { label: "Mon agenda", icon: CalendarDays, href: "/dashboard/coach/moi/agenda" },
        ].map(({ label, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="ep-press"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 13px", borderRadius: 999,
              background: "rgba(245,237,237,0.04)", border: "1px solid rgba(137,4,4,0.25)",
              color: "rgba(245,237,237,0.6)", fontSize: 11, fontWeight: 700,
              textDecoration: "none", whiteSpace: "nowrap",
            }}
          >
            <Icon size={12} strokeWidth={1.8} />
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}
