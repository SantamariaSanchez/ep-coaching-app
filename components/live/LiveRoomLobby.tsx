"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle, Check, ChevronLeft, Copy, Headphones, MessageCircle, Mic, Smartphone, Square, Video,
} from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { capitalize, formatCountdown, formatLiveDateTime, formatLiveTime } from "@/lib/live-time";

// Salle d'attente du live, qui remplace la visio embarquée (JitsiRoom).
//
// Pourquoi : depuis mai 2023, meet.jit.si coupe au bout de 5 minutes toute
// réunion embarquée dans un autre site (iframe ou External API), avec le
// message "Embedding meet.jit.si is only meant for demo purposes". Un 1:1
// de 30 min, un audit de 60 min ou un atelier mouraient donc tous à la 5e
// minute. Ouverte dans son propre onglet (ou dans l'appli Jitsi Meet sur
// téléphone), la même salle n'a aucune limite de durée, sans compte ni clé
// ni coût. La salle garde le même nom aléatoire et long (generateRoomSlug) :
// seul quelqu'un qui a le lien peut la rejoindre, comme avant.

function jitsiRoomUrl(roomSlug: string): string {
  return `https://meet.jit.si/${encodeURIComponent(roomSlug)}`;
}

// Pré-remplit le nom affiché dans Jitsi via les paramètres de fragment
// (jamais envoyés au serveur), valeur encodée en JSON comme Jitsi l'attend.
// Le lien copié, lui, reste neutre : il peut être ouvert sur un autre appareil.
function jitsiJoinUrl(roomSlug: string, displayName?: string | null): string {
  const base = jitsiRoomUrl(roomSlug);
  const name = displayName?.trim();
  if (!name) return base;
  return `${base}#userInfo.displayName=${encodeURIComponent(JSON.stringify(name))}`;
}

// Horloge rafraîchie chaque seconde, uniquement après le montage : le
// premier rendu (serveur puis hydratation) n'affiche aucun compte à rebours,
// donc aucun écart d'hydratation entre l'heure du serveur et celle du
// téléphone.
function useNow(intervalMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [intervalMs]);
  return now;
}

const TIPS = [
  { icon: Mic, text: "Autorise le micro et la caméra quand ton navigateur te le demande." },
  { icon: Headphones, text: "Un casque ou des écouteurs évitent l'écho pendant l'appel." },
  { icon: Smartphone, text: "Sur téléphone, l'appli Jitsi Meet (gratuite) s'ouvre si elle est installée : c'est le plus stable." },
];

export default function LiveRoomLobby({
  eventId,
  roomSlug,
  title,
  typeLabel,
  startsAt,
  durationMinutes,
  backHref,
  displayName,
  isHost = false,
  onEndLive,
}: {
  eventId: string;
  roomSlug: string;
  title: string;
  typeLabel: string;
  startsAt: string;
  durationMinutes: number;
  backHref: string;
  /** Nom pré-rempli dans Jitsi (prénom du participant). */
  displayName?: string | null;
  /** true pour le coach, toujours hôte du live (voir host_id en base). */
  isHost?: boolean;
  /** Réservé à l'hôte : marque le live comme terminé (voir endLiveEvent). */
  onEndLive?: () => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const now = useNow();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);

  const roomUrl = jitsiRoomUrl(roomSlug);
  const joinUrl = jitsiJoinUrl(roomSlug, displayName);

  const start = new Date(startsAt).getTime();
  const end = start + durationMinutes * 60 * 1000;

  let statusLabel: string;
  let live = false;
  if (now === null) {
    statusLabel = `Prévu à ${formatLiveTime(startsAt)}`;
  } else if (now < start) {
    statusLabel = `Commence dans ${formatCountdown(start - now)}`;
  } else if (now < end) {
    live = true;
    statusLabel = `En cours depuis ${formatCountdown(now - start)}`;
  } else {
    live = true;
    statusLabel = `Durée prévue dépassée de ${formatCountdown(now - end)}`;
  }
  const progress = now !== null && now >= start ? Math.min(1, (now - start) / (end - start || 1)) : 0;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      // Presse-papiers refusé (navigateur intégré, permission...) : on
      // affiche le lien en clair pour qu'il reste copiable à la main.
      setCopyState("failed");
    }
  }

  async function handleEndLive() {
    if (!onEndLive || ending) return;
    const ok = await confirm(
      "Terminer ce live ? Il passera dans les lives passés et tu pourras écrire tes notes tout de suite.",
      { confirmLabel: "Terminer", cancelLabel: "Continuer" }
    );
    if (!ok) return;
    setEnding(true);
    setEndError(null);
    try {
      const res = await onEndLive();
      if (res.error) {
        setEndError(res.error);
        setEnding(false);
        return;
      }
      // Direction la carte du live, saisie des notes déjà ouverte.
      router.push(`${backHref}?recap=${encodeURIComponent(eventId)}`);
    } catch {
      setEndError("Impossible de terminer le live pour le moment, réessaie.");
      setEnding(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        background:
          "radial-gradient(ellipse 80% 55% at 50% -10%, rgba(200,5,5,0.28) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 105% 95%, rgba(137,4,4,0.18) 0%, transparent 55%), #070000",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          borderBottom: "1px solid rgba(137,4,4,0.25)",
          flexShrink: 0,
        }}
      >
        <Link
          href={backHref}
          style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(245,237,237,0.5)", fontSize: 12, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}
        >
          <ChevronLeft size={14} /> Quitter
        </Link>
        <p
          style={{
            fontSize: 12, fontWeight: 800, color: "#F5EDED", margin: 0, flex: 1, minWidth: 0,
            textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          {title}
        </p>
        <div style={{ width: 56, flexShrink: 0 }} />
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px 40px" }}>
        <div className="ep-card-hero" style={{ width: "100%", maxWidth: 460, padding: "24px 20px" }}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <p className="ep-label" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <Video size={11} /> {typeLabel}
            </p>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: "#F5EDED", margin: 0, lineHeight: 1.25, overflowWrap: "anywhere" }}>
              {title}
            </h1>
            <p style={{ fontSize: 12, color: "rgba(245,237,237,0.45)", margin: "6px 0 0" }}>
              {capitalize(formatLiveDateTime(startsAt))} · {durationMinutes} min · heure de Paris
            </p>

            <div
              aria-live="polite"
              style={{
                marginTop: 16,
                padding: "12px 14px",
                borderRadius: 12,
                background: live ? "rgba(224,30,30,0.10)" : "rgba(137,4,4,0.10)",
                border: `1px solid ${live ? "rgba(224,30,30,0.35)" : "rgba(137,4,4,0.28)"}`,
              }}
            >
              <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 900, color: "#F5EDED", margin: 0 }}>
                {live && (
                  <span
                    aria-hidden
                    style={{ width: 8, height: 8, borderRadius: "50%", background: "#E01E1E", boxShadow: "0 0 10px rgba(224,30,30,0.8)", flexShrink: 0 }}
                  />
                )}
                {statusLabel}
              </p>
              {live && (
                <div style={{ marginTop: 10, height: 3, borderRadius: 2, background: "rgba(245,237,237,0.08)", overflow: "hidden" }}>
                  <div style={{ width: `${Math.round(progress * 100)}%`, height: "100%", background: "linear-gradient(90deg, #890404, #E01E1E)" }} />
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
              <a
                href={joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ep-btn-primary"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none", width: "100%" }}
              >
                <Video size={15} /> Ouvrir la visio
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="ep-btn-secondary"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}
              >
                {copyState === "copied" ? <Check size={14} /> : <Copy size={14} />}
                {copyState === "copied" ? "Lien copié" : "Copier le lien"}
              </button>
              {copyState === "failed" && (
                <div style={{ fontSize: 11.5, color: "rgba(245,237,237,0.6)", lineHeight: 1.5 }}>
                  <p style={{ margin: "0 0 4px", display: "flex", alignItems: "center", gap: 6, color: "#ff6b6b", fontWeight: 700 }}>
                    <AlertCircle size={12} /> Copie automatique impossible, garde ce lien :
                  </p>
                  <p style={{ margin: 0, userSelect: "all", overflowWrap: "anywhere", fontFamily: "monospace", color: "#F5EDED" }}>
                    {roomUrl}
                  </p>
                </div>
              )}
            </div>

            <p style={{ fontSize: 12, color: "rgba(245,237,237,0.6)", lineHeight: 1.6, margin: "16px 0 0" }}>
              {isHost
                ? "meet.jit.si peut te demander de te connecter (Google ou GitHub) pour ouvrir la salle en tant qu'hôte. Tes clients patientent dans le hall jusqu'à ton arrivée."
                : "La visio s'ouvre dans un nouvel onglet. Si la salle affiche \"en attente de l'hôte\", ton coach arrive : reste connecté."}
            </p>

            <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0", display: "grid", gap: 8 }}>
              {TIPS.map(({ icon: Icon, text }) => (
                <li key={text} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <Icon size={13} style={{ color: "#E01E1E", flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 11.5, color: "rgba(245,237,237,0.5)", lineHeight: 1.5 }}>{text}</span>
                </li>
              ))}
            </ul>

            {isHost && onEndLive ? (
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(224,30,30,0.12)" }}>
                <button
                  type="button"
                  onClick={handleEndLive}
                  disabled={ending}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%",
                    background: "rgba(224,30,30,0.12)", border: "1px solid rgba(224,30,30,0.35)", borderRadius: 10,
                    padding: "11px 14px", color: "#E01E1E", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em",
                    textTransform: "uppercase", cursor: ending ? "wait" : "pointer", opacity: ending ? 0.6 : 1,
                  }}
                >
                  <Square size={11} />
                  {ending ? "Clôture..." : "Terminer le live"}
                </button>
                <p style={{ fontSize: 10.5, color: "rgba(245,237,237,0.35)", margin: "6px 0 0", textAlign: "center" }}>
                  Pense à raccrocher aussi dans l&apos;onglet Jitsi.
                </p>
                {endError && (
                  <p role="alert" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#ff6b6b", margin: "8px 0 0" }}>
                    <AlertCircle size={12} style={{ flexShrink: 0 }} /> {endError}
                  </p>
                )}
              </div>
            ) : (
              <Link
                href="/dashboard/client/messages"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 16, fontSize: 11, fontWeight: 700, color: "#E01E1E", textDecoration: "none" }}
              >
                <MessageCircle size={12} /> Un souci pour te connecter ? Écris à ton coach
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
