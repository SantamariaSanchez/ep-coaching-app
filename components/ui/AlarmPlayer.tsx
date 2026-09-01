"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Fait vraiment "sonner" l'appli quand un bloc d'agenda de type réveil
// (voir app/api/cron/schedule-block-notify/route.ts, label contenant
// "Réveil") arrive à son heure. Une Notification push seule ("silent:
// false") ne joue qu'un bip système discret, pas un vrai son de réveil, et
// peut disparaître seule sans jamais être vue pendant le sommeil. Ici, tant
// qu'un onglet de l'appli est ouvert (premier plan ou arrière-plan), le
// service worker (public/sw.js) lui envoie un message "PLAY_ALARM" et ce
// composant joue un vrai son en boucle (Web Audio, pas de fichier audio
// externe nécessaire) avec un overlay plein écran impossible à rater.
//
// Limite honnête : si aucun onglet n'est ouvert du tout, ni Apple ni
// Android ne laissent un service worker jouer du son en tâche de fond
// hors appli ouverte — seule la notification système (avec vibration)
// reste disponible dans ce cas, c'est une contrainte de la plateforme,
// pas quelque chose de contournable depuis le code de l'appli.
export default function AlarmPlayer() {
  const [ringing, setRinging] = useState<{ title: string; body: string; url: string; blockId?: string } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopFnRef = useRef<(() => void) | null>(null);
  const [needsTap, setNeedsTap] = useState(false);

  const playAlarmTone = useCallback(() => {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return () => {};
    const ctx = new Ctx();
    audioCtxRef.current = ctx;

    let stopped = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Deux tonalités alternées façon réveil classique (~880Hz / ~660Hz),
    // bips courts et répétés plutôt qu'un son continu : plus efficace pour
    // réveiller, moins désagréable qu'une sirène continue.
    function beepCycle() {
      if (stopped) return;
      const now = ctx.currentTime;
      [0, 0.3].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = i === 0 ? 880 : 660;
        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.35, now + offset + 0.02);
        gain.gain.linearRampToValueAtTime(0, now + offset + 0.25);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.26);
      });
      timeoutId = setTimeout(beepCycle, 900);
    }

    if (ctx.state === "suspended") {
      ctx.resume().then(() => {
        setNeedsTap(false);
        beepCycle();
      }).catch(() => setNeedsTap(true));
    } else {
      beepCycle();
    }

    return () => {
      stopped = true;
      if (timeoutId) clearTimeout(timeoutId);
      ctx.close().catch(() => {});
    };
  }, []);

  const stopAlarm = useCallback(() => {
    stopFnRef.current?.();
    stopFnRef.current = null;
    // Appuyer sur "Arrêter" vaut acquittement : coupe l'escalade côté cron
    // (voir app/api/cron/schedule-block-notify) sans quoi la notif reviendrait
    // toutes les 5 min même après que l'utilisateur est réveillé.
    if (ringing?.blockId) {
      fetch("/api/client/schedule-blocks/ack-alarm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId: ringing.blockId }),
      }).catch(() => {});
    }
    setRinging(null);
    setNeedsTap(false);
  }, [ringing]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data) return;
      if (data.type === "PLAY_ALARM") {
        setRinging({ title: data.title || "Réveil", body: data.body || "C'est l'heure de te lever.", url: data.url || "/", blockId: data.blockId });
        stopFnRef.current = playAlarmTone();
      } else if (data.type === "STOP_ALARM") {
        stopAlarm();
      }
    }

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [playAlarmTone, stopAlarm]);

  // Retente le démarrage du son au premier geste utilisateur si l'autoplay
  // avait été bloqué (politique navigateur : un AudioContext ne peut pas
  // toujours démarrer seul sans interaction préalable dans l'onglet).
  const retryOnTap = useCallback(() => {
    if (!ringing) return;
    stopFnRef.current?.();
    stopFnRef.current = playAlarmTone();
  }, [ringing, playAlarmTone]);

  if (!ringing) return null;

  return (
    <div
      role="alertdialog"
      aria-label="Réveil"
      onClick={needsTap ? retryOnTap : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "radial-gradient(circle at 50% 30%, #3a0505 0%, #0D0000 70%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        padding: "2rem",
        textAlign: "center",
        color: "#fff",
      }}
    >
      <div style={{ fontSize: "3.5rem", animation: "ep-alarm-pulse 1s ease-in-out infinite" }}>⏰</div>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>{ringing.title}</h1>
      <p style={{ fontSize: "1.05rem", opacity: 0.85, margin: 0, maxWidth: 360 }}>{ringing.body}</p>
      {needsTap && (
        <p style={{ fontSize: "0.9rem", opacity: 0.7, margin: 0 }}>Touche l'écran pour activer le son</p>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          stopAlarm();
        }}
        style={{
          marginTop: "1rem",
          padding: "1rem 3rem",
          fontSize: "1.1rem",
          fontWeight: 700,
          borderRadius: "999px",
          border: "none",
          background: "#fff",
          color: "#3a0505",
          cursor: "pointer",
        }}
      >
        Arrêter
      </button>
      <style>{`
        @keyframes ep-alarm-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
