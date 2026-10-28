import Link from "next/link";
import {
  Sparkles, Apple, Moon, CalendarClock, Video, MessageCircle,
  LayoutTemplate, CalendarDays, ArrowRight, Backpack, ExternalLink, Footprints, ChevronDown,
} from "lucide-react";
import type { SessionAccessory } from "@/lib/session-accessories";
import { withAlpha } from "@/lib/theme-color";
// Réexporté pour compatibilité : app/dashboard/coach/page.tsx importe
// encore timeAwareGreeting depuis ce fichier. La logique vit désormais
// dans lib/dates.ts (repasse masterclass 2026-09-10, brainstorm "onglet
// Aujourd'hui, version membre") pour être réutilisable côté client sans
// entraîner ce composant (dashboard coach) dans son bundle.
export { timeAwareGreeting } from "@/lib/dates";

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
  /** Id du client (= id de conversation, une conversation par membre) — pour lier directement vers sa fiche de messages. */
  clientId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface MyDayCardProps {
  tip: string;
  nutrition: { logged: number; target: number | null } | null;
  sleepHours: number | null;
  // Retour direct : "c'est bien mais c'est mieux si ça dit le créneau
  // actuel comme ça je sais je dois faire quoi, et en tout petit le
  // créneau suivant" — currentBlock (celui EN COURS, start <= maintenant <
  // end) prend la place principale, nextBlock ne reste qu'en petit dessous.
  currentBlock: { label: string; endTime: string } | null;
  nextBlock: { label: string; startTime: string } | null;
  nextLive: { title: string; startsAt: string } | null;
  unreadPreview: UnreadPreview[];
  /** Nombre total de messages non lus (unreadPreview n'en montre que 3 au plus). */
  unreadTotal: number;
  /** Nom de la séance du jour, déduit de l'agenda ("Push", "Legs / Biceps"...), null si jour off. */
  todaySeanceLabel: string | null;
  /** Accessoires à prévoir pour la séance du jour (lib/session-accessories.ts). */
  todayAccessories: SessionAccessory[];
  /** Pas du jour — actual = null tant qu'aucune source (Oura, manuel) n'a rien remonté. */
  steps: { actual: number | null; goal: number };
}

function MiniCard({
  icon: Icon,
  accent,
  label,
  value,
  sub,
  microSub,
  href,
  delay = 0,
}: {
  icon: React.ElementType;
  accent: string;
  label: string;
  value: string;
  sub: string;
  /** Ligne supplémentaire, encore plus discrète que `sub` — ex. le créneau suivant, en tout petit sous le créneau actuel. */
  microSub?: string;
  href: string;
  delay?: number;
}) {
  return (
    <Link
      href={href}
      aria-label={`${label} : ${value}, ${sub}${microSub ? `, ${microSub}` : ""}`}
      className="animate-fade-up ep-press"
      style={{
        animationDelay: `${delay}ms`,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "12px 14px",
        borderRadius: "var(--radius-lg)",
        background: "linear-gradient(160deg, var(--ep-s2) 0%, var(--ep-bg) 100%)",
        border: `1px solid ${withAlpha(accent, "22")}`,
        textDecoration: "none",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: accent }}>
        <Icon size={13} strokeWidth={2} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.5)" }}>
          {label}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "var(--ep-ink)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
        {value}
      </p>
      <p style={{ margin: 0, fontSize: 10.5, color: "rgba(var(--ep-ink-rgb),0.5)", lineHeight: 1.3 }}>
        {sub}
      </p>
      {microSub && (
        <p style={{ margin: 0, fontSize: 10, color: "rgba(var(--ep-ink-rgb),0.4)", lineHeight: 1.2 }}>
          {microSub}
        </p>
      )}
    </Link>
  );
}

export default function MyDayCard({
  tip,
  nutrition,
  sleepHours,
  currentBlock,
  nextBlock,
  nextLive,
  unreadPreview,
  unreadTotal,
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

  // Créneau EN COURS prioritaire (label de la mini-carte adapté en
  // conséquence) — le suivant ne reste qu'en petit dessous, jamais la
  // valeur principale dès qu'il y a un créneau actuel à afficher.
  const agendaLabel = currentBlock ? "Créneau actuel" : "Prochain créneau";
  const agendaValue = currentBlock ? currentBlock.label : nextBlock ? nextBlock.label : "Rien de prévu";
  const agendaSub = currentBlock
    ? `jusqu'à ${currentBlock.endTime.slice(0, 5)}`
    : nextBlock
      ? `à ${nextBlock.startTime.slice(0, 5)}`
      : "journée libre";
  const agendaMicroSub =
    currentBlock && nextBlock ? `puis ${nextBlock.label} à ${nextBlock.startTime.slice(0, 5)}` : undefined;

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

  const unreadValue = unreadTotal > 0 ? `${unreadTotal} ${unreadTotal > 1 ? "non lus" : "non lu"}` : "Tout lu";
  const unreadSub = unreadTotal > 0 ? "répondre à tes clients" : "boîte à jour";

  // Accueil sans scroll (2026-10-28) : le téléphone montre d'abord ce qui
  // demande une action (créneau en cours, messages, accès rapides). Le suivi
  // perso (nutrition, sommeil, pas, live), l'astuce et « à prévoir » sont
  // repliés dans « Plus pour aujourd'hui », un tap.
  return (
    <section className="animate-fade-up" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        <p className="ep-section-title" style={{ margin: 0 }}>Ma journée</p>
        {/* Jour ON/OFF — repère immédiat maintenant que l'agenda a une
            structure fixe et prévisible chaque semaine. */}
        <span
          style={{
            fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
            padding: "3px 9px", borderRadius: 999,
            color: todaySeanceLabel ? "var(--ep-accent)" : "var(--ep-ok)",
            background: todaySeanceLabel ? "rgba(var(--ep-accent-rgb),0.1)" : "rgba(var(--ep-ok-rgb),0.1)",
            border: `1px solid ${todaySeanceLabel ? "rgba(var(--ep-accent-rgb),0.25)" : "rgba(var(--ep-ok-rgb),0.25)"}`,
          }}
        >
          {todaySeanceLabel ? `Jour ON · ${todaySeanceLabel}` : "Jour OFF"}
        </span>
      </div>

      {/* Les deux infos qui comptent maintenant. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 10 }}>
        <MiniCard icon={CalendarClock} accent="var(--ep-orange)" label={agendaLabel} value={agendaValue} sub={agendaSub} microSub={agendaMicroSub} href="/dashboard/coach/moi/agenda" delay={0} />
        <MiniCard icon={MessageCircle} accent="var(--ep-accent)" label="Messages" value={unreadValue} sub={unreadSub} href="/dashboard/coach/messages" delay={50} />
      </div>

      {/* Aperçu des messages non lus (les deux derniers) : un tap ouvre la conversation. */}
      {unreadPreview.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {unreadPreview.slice(0, 2).map((m) => (
            <Link
              key={m.id}
              // Renvoie directement sur la conversation du membre
              // (/dashboard/coach/messages/[clientId]), audit friction 2026-09-16.
              href={`/dashboard/coach/messages/${m.clientId}`}
              className="ep-press"
              style={{
                display: "flex", alignItems: "center", gap: 10, minHeight: 44,
                padding: "6px 12px", borderRadius: 10,
                background: "var(--ep-s2)", border: "1px solid rgba(var(--ep-line-rgb),0.25)",
                textDecoration: "none",
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

      {/* Accès rapides — zone tactile de 44 px. */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 6, paddingBottom: 2 }}>
        {[
          { label: "Studio créatif", icon: Sparkles, href: "/dashboard/coach/studio" },
          { label: "Nouveau modèle", icon: LayoutTemplate, href: "/dashboard/coach/programmation" },
          { label: "Mon agenda", icon: CalendarDays, href: "/dashboard/coach/moi/agenda" },
        ].map(({ label, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="ep-press"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44,
              padding: "0 14px", borderRadius: 999, flexShrink: 0,
              background: "rgba(var(--ep-ink-rgb),0.04)", border: "1px solid rgba(var(--ep-line-rgb),0.25)",
              color: "rgba(var(--ep-ink-rgb),0.7)", fontSize: 12, fontWeight: 700,
              textDecoration: "none", whiteSpace: "nowrap",
            }}
          >
            <Icon size={13} strokeWidth={1.8} />
            {label}
          </Link>
        ))}
      </div>

      <details className="ep-home-details">
        <summary style={{ listStyle: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 44 }}>
          <span className="ep-section-title" style={{ margin: 0 }}>Plus pour aujourd&apos;hui</span>
          <ChevronDown size={15} style={{ color: "rgba(var(--ep-ink-rgb),0.4)" }} />
        </summary>

        {/* Astuce du jour — stable toute la journée (getTipOfTheDay). */}
        <div
          style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "12px 16px", margin: "6px 0 12px",
            borderRadius: "var(--radius-lg)",
            background: "rgba(var(--ep-accent-rgb),0.05)",
            border: "1px solid rgba(var(--ep-accent-rgb),0.14)",
          }}
        >
          <Sparkles size={14} style={{ color: "var(--ep-accent)", flexShrink: 0, marginTop: 1 }} strokeWidth={1.8} />
          <p style={{ margin: 0, fontSize: 12.5, color: "rgba(var(--ep-ink-rgb),0.65)", lineHeight: 1.5 }}>{tip}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 12 }}>
          <MiniCard icon={Apple} accent="var(--ep-ok)" label="Nutrition" value={nutritionValue} sub={nutritionSub} href="/dashboard/coach/moi/nutrition" delay={0} />
          <MiniCard icon={Moon} accent="var(--ep-info)" label="Sommeil" value={sleepValue} sub={sleepSub} href="/dashboard/coach/moi/tracking" delay={50} />
          <MiniCard icon={Footprints} accent="var(--ep-ok)" label="Pas" value={stepsValue} sub={stepsSub} href="/dashboard/coach/moi/steps" delay={100} />
          <MiniCard icon={Video} accent="var(--ep-violet)" label="Prochain live" value={liveValue} sub={liveSub} href="/dashboard/coach/live" delay={150} />
        </div>

        {/* « À prévoir » pour la séance du jour (accessoires), voir
            lib/session-accessories.ts. */}
        {todaySeanceLabel && todayAccessories.length > 0 && (
          <div
            style={{
              marginBottom: 6, padding: "12px 16px", borderRadius: "var(--radius-lg)",
              background: "rgba(var(--ep-shade-rgb),0.3)", border: "1px solid rgba(var(--ep-line-rgb),0.2)",
            }}
          >
            <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.5)", margin: "0 0 8px" }}>
              <Backpack size={12} /> À prévoir pour {todaySeanceLabel}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {todayAccessories.map((a) =>
                // ALWAYS_ACCESSORIES (trépied, shaker) n'ont pas de fiche produit.
                a.url ? (
                  <a key={a.accessory} href={a.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, minHeight: 32, fontSize: 12.5, fontWeight: 700, color: "var(--ep-ink)", textDecoration: "none" }}>
                    {a.accessory}
                    <ExternalLink size={10} style={{ color: "rgba(var(--ep-ink-rgb),0.4)" }} />
                  </a>
                ) : (
                  <span key={a.accessory} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: "var(--ep-ink)" }}>
                    {a.accessory}
                  </span>
                )
              )}
            </div>
          </div>
        )}
      </details>
    </section>
  );
}
