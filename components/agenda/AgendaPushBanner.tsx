"use client";

import { useEffect, useState } from "react";
import { BellRing, Share } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";

// Rappels de l'agenda (2026-11-15, retour d'Emmanuel : « faut que les notif
// fonctionnent ») : côté serveur tout part (cron chaque minute, envoi web
// push vérifié), mais un appareil où la permission n'a jamais été donnée ne
// reçoit rien, et le bouton vivait au fond des Paramètres. Ce bandeau
// s'affiche dans l'agenda seulement quand CET appareil ne recevra pas les
// rappels, avec l'action qui débloque :
// - iPhone dans Safari : les notifications n'existent qu'une fois l'appli
//   ajoutée à l'écran d'accueil (limite d'Apple) ;
// - permission jamais demandée : un bouton « Activer » ;
// - permission refusée : où la réautoriser.
// Dans l'appli native (Capacitor), NativeBridge gère déjà tout : rien ici.

type State = "hidden" | "ios-install" | "prompt" | "denied" | "done";

function computeState(): State {
  if (typeof window === "undefined") return "hidden";
  const w = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
  if (w.Capacitor?.isNativePlatform?.()) return "hidden";
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return "ios-install";
  if (typeof Notification === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return "hidden";
  if (Notification.permission === "granted") return "hidden";
  return Notification.permission === "denied" ? "denied" : "prompt";
}

export default function AgendaPushBanner() {
  const t = useT();
  const [state, setState] = useState<State>("hidden");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lu après le rendu : navigator n'existe pas côté serveur.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setState(computeState()), []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "prompt");
        return;
      }
      const b64 = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const pad = "=".repeat((4 - (b64.length % 4)) % 4);
      const raw = window.atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
      const key = Uint8Array.from([...raw].map((c) => c.charCodeAt(0))).buffer as ArrayBuffer;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error("subscribe");
      setState("done");
    } catch {
      setError(t("Activation impossible, réessaie dans un instant."));
    } finally {
      setBusy(false);
    }
  }

  if (state === "hidden") return null;

  const box: React.CSSProperties = { padding: "11px 14px", display: "flex", alignItems: "center", gap: 12, marginBottom: 12, border: "1px solid rgba(var(--ep-accent-rgb),0.35)" };

  if (state === "done") {
    return (
      <div className="ep-card" style={{ ...box, borderColor: "rgba(var(--ep-ok-rgb),0.4)" }} role="status">
        <BellRing size={17} style={{ color: "var(--ep-ok)", flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "var(--ep-ink)" }}>{t("Rappels activés sur cet appareil.")}</p>
      </div>
    );
  }

  if (state === "ios-install") {
    return (
      <div className="ep-card" style={box}>
        <Share size={17} style={{ color: "var(--ep-accent)", flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: 12.5, color: "rgba(var(--ep-ink-rgb),0.75)", lineHeight: 1.5 }}>
          {t("Sur iPhone, les rappels marchent seulement depuis l'appli sur l'écran d'accueil : touche Partager puis « Sur l'écran d'accueil », ouvre EP Coaching depuis l'icône, et active les rappels ici.")}
        </p>
      </div>
    );
  }

  return (
    <div className="ep-card" style={box}>
      <BellRing size={17} style={{ color: "var(--ep-accent)", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: "var(--ep-ink)" }}>
          {state === "denied" ? t("Rappels bloqués sur cet appareil") : t("Tes rappels ne sonneront pas sur cet appareil")}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "rgba(var(--ep-ink-rgb),0.55)", lineHeight: 1.45 }}>
          {state === "denied"
            ? t("Autorise les notifications pour ce site dans les réglages du navigateur (ou du téléphone), puis recharge.")
            : t("Un tap pour recevoir chaque bloc à l'heure.")}
        </p>
        {error && <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--ep-bad)" }}>{error}</p>}
      </div>
      {state === "prompt" && (
        <button type="button" onClick={enable} disabled={busy} className="ep-btn-primary" style={{ height: 38, padding: "0 14px", fontSize: 12, flexShrink: 0 }}>
          {busy ? "…" : t("Activer")}
        </button>
      )}
    </div>
  );
}
