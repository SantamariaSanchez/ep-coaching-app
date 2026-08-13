"use client";

import { useState } from "react";
import Link from "next/link";
import { Gift, ArrowRight, Bell, Check } from "lucide-react";

interface ClientCardProps {
  name: string;
  phase?: string | null;
  weight?: number | null;
  weekNum?: number | null;
  alerts?: number;
  href?: string;
  delay?: number;
  onClick?: () => void;
  /** Abonné ayant atteint le rang Légende — récompense Oura Ring à remettre. */
  ouraEligible?: boolean;
  /** Phase de coaching en cours (Calibrage, Optimisation, Performance). */
  coachingPhase?: string | null;
  /** Statut du suivi : un client en pause ou terminé doit se repérer d'un coup d'œil. */
  status?: "active" | "paused" | "ended" | null;
  /** Jours depuis la dernière activité (entraînement/nutrition/bilan), null = aucune vue récemment. */
  daysSinceActivity?: number | null;
  /** Fiche client jamais terminée (item 14) — n'affiche le badge/bouton que si true. */
  intakeIncomplete?: boolean;
  /** Relance manuelle en un clic ; absent = pas de bouton (ex: page sans l'action câblée). */
  onRelaunch?: () => Promise<{ error?: string }>;
}

export function ClientCard({
  name,
  phase,
  weight,
  weekNum,
  alerts = 0,
  href,
  delay = 0,
  onClick,
  ouraEligible = false,
  coachingPhase = null,
  status = null,
  daysSinceActivity = null,
  intakeIncomplete = false,
  onRelaunch,
}: ClientCardProps) {
  const [relaunchState, setRelaunchState] = useState<"idle" | "sending" | "sent">("idle");

  async function handleRelaunch(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onRelaunch || relaunchState !== "idle") return;
    setRelaunchState("sending");
    const res = await onRelaunch();
    setRelaunchState(res?.error ? "idle" : "sent");
  }
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const phaseColor =
    phase === "deficit"  ? "#E01E1E"
    : phase === "surplus"  ? "#4ade80"
    : "#fb923c";
  const phaseLabel =
    phase === "deficit"  ? "Déficit"
    : phase === "surplus"  ? "Surplus"
    : phase ? "Maintenance"
    : null;

  // "Actif" n'est pas affiché : c'est le cas normal, le signaler ajouterait
  // du bruit sur toutes les cartes sans jamais rien apprendre au coach.
  const statusLabel =
    status === "paused" ? "En pause"
    : status === "ended" ? "Terminé"
    : null;

  // Même logique pour le silence : rien en dessous de 5 jours (normal),
  // orange entre 5 et 9, rouge à partir de 10 ou si aucune activité vue du
  // tout sur la fenêtre regardée (voir lib/client-activity.ts). Jamais
  // affiché pour un client en pause/terminé : l'absence d'activité y est
  // normale, pas un signal à traiter.
  const isActiveStatus = status == null || status === "active";
  const silentLabel =
    !isActiveStatus ? null
    : daysSinceActivity == null ? "Inactif"
    : daysSinceActivity >= 5 ? `${daysSinceActivity}j sans activité`
    : null;
  const silentColor = daysSinceActivity != null && daysSinceActivity < 10 ? "#fb923c" : "#E01E1E";

  return (
    <div
      onClick={onClick}
      className="animate-fade-up"
      style={{
        animationDelay: `${delay}ms`,
        background: "linear-gradient(160deg, #180101 0%, #0d0000 100%)",
        border: "1px solid rgba(224,30,30,0.09)",
        borderRadius: "var(--radius-lg)",
        padding: 20,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!onClick) return;
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(224,30,30,0.28)";
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = "0 12px 40px rgba(0,0,0,0.5)";
      }}
      onMouseLeave={(e) => {
        if (!onClick) return;
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(224,30,30,0.09)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
      }}
    >
      {/* Top accent */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        height: 1,
        background: "linear-gradient(90deg, transparent, rgba(224,30,30,0.25), transparent)",
      }} />

      {/* Oura Ring eligibility badge */}
      {ouraEligible && (
        <div
          title="Rang Légende atteint : Oura Ring à offrir"
          style={{
            position: "absolute",
            top: 14, left: 14,
            background: "rgba(250,204,21,0.12)",
            border: "1px solid rgba(250,204,21,0.35)",
            borderRadius: "50%",
            width: 26, height: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Gift size={12} style={{ color: "#FACC15" }} strokeWidth={2} />
        </div>
      )}

      {/* Alert badge */}
      {alerts > 0 && (
        <div
          className="animate-pulse-glow"
          style={{
            position: "absolute",
            top: 14, right: 14,
            background: "#E01E1E",
            color: "#fff",
            borderRadius: "50%",
            width: 20, height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 800,
          }}
        >
          {alerts > 9 ? "9+" : alerts}
        </div>
      )}

      {/* Header: avatar + name */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          background: "linear-gradient(135deg, #E01E1E, #890404)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-playfair, 'Playfair Display'), serif",
          fontStyle: "italic",
          fontWeight: 800,
          fontSize: 16,
          color: "#F5EDED",
          flexShrink: 0,
          boxShadow: "0 4px 12px rgba(224,30,30,0.2)",
        }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontWeight: 700,
            fontSize: 15,
            color: "#F5EDED",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}>
            {name}
          </div>
          {/* Phase de coaching et statut du suivi : deux informations qu'il
              fallait auparavant ouvrir la fiche pour connaître. */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
            {phaseLabel && (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                background: `${phaseColor}14`,
                border: `1px solid ${phaseColor}28`,
                borderRadius: 20,
                padding: "2px 10px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.07em",
                color: phaseColor,
                textTransform: "uppercase",
              }}>
                {phaseLabel}
              </span>
            )}
            {coachingPhase && (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                background: "rgba(224,30,30,0.1)",
                border: "1px solid rgba(224,30,30,0.24)",
                borderRadius: 20,
                padding: "2px 10px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.07em",
                color: "rgba(245,237,237,0.72)",
                textTransform: "uppercase",
              }}>
                {coachingPhase}
              </span>
            )}
            {statusLabel && (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                background: "rgba(245,237,237,0.05)",
                border: "1px solid rgba(245,237,237,0.18)",
                borderRadius: 20,
                padding: "2px 10px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.07em",
                color: "rgba(245,237,237,0.45)",
                textTransform: "uppercase",
              }}>
                {statusLabel}
              </span>
            )}
            {silentLabel && (
              <span
                title="Aucune séance, log nutrition ou bilan récent"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: `${silentColor}14`,
                  border: `1px solid ${silentColor}28`,
                  borderRadius: 20,
                  padding: "2px 10px",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  color: silentColor,
                  textTransform: "uppercase",
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: silentColor, flexShrink: 0 }} />
                {silentLabel}
              </span>
            )}
            {intakeIncomplete && isActiveStatus && (
              <span
                title="Le formulaire d'onboarding n'a jamais été terminé"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "rgba(96,165,250,0.1)",
                  border: "1px solid rgba(96,165,250,0.24)",
                  borderRadius: 20,
                  padding: "2px 10px",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  color: "#60A5FA",
                  textTransform: "uppercase",
                }}
              >
                Fiche à finir
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        marginBottom: href ? 14 : 0,
      }}>
        {[
          { label: "Semaine",       value: weekNum != null ? `S${weekNum}`  : "···" },
          { label: "Poids initial", value: weight  != null ? `${weight} kg` : "···" },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: "rgba(0,0,0,0.3)",
            borderRadius: 10,
            padding: "8px 10px",
            textAlign: "center",
          }}>
            <div style={{
              fontSize: 14,
              fontWeight: 800,
              color: (stat as { color?: string }).color ?? "#F5EDED",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}>
              {stat.value}
            </div>
            <div style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(245,237,237,0.28)",
              marginTop: 4,
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Accès explicite à la fiche. La carte entière reste cliquable (rien
          ne change pour qui a l'habitude), mais l'action principale est
          maintenant nommée au lieu d'être devinée. Un Link : Next préchauffe
          la fiche au survol, l'ouverture est quasi instantanée. */}
      {href && (
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href={href}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(224,30,30,0.1)",
              border: "1px solid rgba(224,30,30,0.22)",
              color: "#F5EDED",
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              textDecoration: "none",
              transition: "background 0.15s ease, border-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = "rgba(224,30,30,0.2)";
              el.style.borderColor = "rgba(224,30,30,0.45)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = "rgba(224,30,30,0.1)";
              el.style.borderColor = "rgba(224,30,30,0.22)";
            }}
          >
            Voir la fiche
            <ArrowRight size={13} strokeWidth={2.4} />
          </Link>

          {/* Relance manuelle (item 14) — uniquement quand il y a quelque
              chose de concret à relancer (fiche pas finie) et que la page
              appelante a câblé l'action. */}
          {intakeIncomplete && onRelaunch && (
            <button
              onClick={handleRelaunch}
              disabled={relaunchState !== "idle"}
              title="Envoyer une relance pour terminer la fiche"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "10px 12px",
                borderRadius: 10,
                background: relaunchState === "sent" ? "rgba(74,222,128,0.1)" : "rgba(96,165,250,0.1)",
                border: `1px solid ${relaunchState === "sent" ? "rgba(74,222,128,0.3)" : "rgba(96,165,250,0.28)"}`,
                color: relaunchState === "sent" ? "#4ade80" : "#60A5FA",
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: relaunchState === "idle" ? "pointer" : "default",
                opacity: relaunchState === "sending" ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {relaunchState === "sent" ? <Check size={13} strokeWidth={2.4} /> : <Bell size={13} strokeWidth={2.4} />}
              {relaunchState === "sent" ? "Envoyée" : "Relancer"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
