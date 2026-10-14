"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, Moon } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { scheduleLockedTestPush } from "@/app/actions/notifications";

// Les rappels d'agenda partent pile à l'heure côté serveur. Chaque
// notification renvoie un accusé de réception quand elle arrive vraiment sur
// l'appareil (public/sw.js → /api/push/ack). Ce bandeau ne s'affiche que s'il
// y a un vrai problème sur CET appareil : notif arrivée en retard (retenue
// jusqu'à l'ouverture de l'appli), iPhone sans l'appli sur l'écran
// d'accueil, ou notifications bloquées.

type Problem = { kind: "late"; minutes: number } | { kind: "pending" } | { kind: "ios-browser" } | { kind: "denied" };

const LATE_SECONDS = 180;

function detectPlatform(): "ios" | "samsung" | "android" | "other" {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/SM-|SAMSUNG|Samsung/.test(ua)) return "samsung";
  if (/Android/.test(ua)) return "android";
  return "other";
}

export default function PushDeliveryAlert() {
  const t = useT();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [platform, setPlatform] = useState<ReturnType<typeof detectPlatform>>("other");
  const [open, setOpen] = useState(false);
  const [test, setTest] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- lecture de l'état push de l'appareil, indisponible au rendu serveur. */
  useEffect(() => {
    if (document.documentElement.classList.contains("ep-native")) return;
    const p = detectPlatform();
    setPlatform(p);
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    if (p === "ios" && !standalone) {
      setProblem({ kind: "ios-browser" });
      return;
    }
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "denied") {
      setProblem({ kind: "denied" });
      return;
    }
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (!sub) return;
        const res = await fetch("/api/push/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        const s = (await res.json()) as { last_sent_at?: string | null; last_delivered_at?: string | null; last_delay_seconds?: number | null };
        const sent = s.last_sent_at ? new Date(s.last_sent_at).getTime() : 0;
        const delivered = s.last_delivered_at ? new Date(s.last_delivered_at).getTime() : 0;
        // Dernière notif envoyée il y a plus de 10 min et jamais arrivée.
        if (sent && delivered < sent && Date.now() - sent > 10 * 60_000) setProblem({ kind: "pending" });
        else if ((s.last_delay_seconds ?? 0) > LATE_SECONDS) setProblem({ kind: "late", minutes: Math.round((s.last_delay_seconds ?? 0) / 60) });
      } catch {}
    })();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!problem) return null;

  const title =
    problem.kind === "ios-browser"
      ? t("Sur iPhone, les notifs n'arrivent qu'avec l'appli sur l'écran d'accueil")
      : problem.kind === "denied"
        ? t("Les notifications sont bloquées sur cet appareil")
        : problem.kind === "late"
          ? t("Ton téléphone a retenu ta dernière notif {m} min", { m: String(problem.minutes) })
          : t("Ta dernière notif n'est pas encore arrivée sur ce téléphone");

  const steps: string[] =
    problem.kind === "ios-browser"
      ? [
          t("1. Dans Safari, touche le bouton Partager (le carré avec la flèche)."),
          t("2. Choisis « Sur l'écran d'accueil », puis « Ajouter »."),
          t("3. Ouvre EP Coaching depuis cette icône et accepte les notifications."),
        ]
      : problem.kind === "denied"
        ? [t("Réglages du téléphone > Notifications > EP Coaching (ou Chrome) : autorise les notifications avec le son.")]
        : platform === "samsung"
          ? [
              t("1. Paramètres > Applications > Chrome > Batterie : « Non restreinte »."),
              t("2. Paramètres > Batterie > Limites d'utilisation en arrière-plan : retire Chrome et EP Coaching des applis en veille."),
              t("3. Paramètres > Notifications > Chrome : autorise ep-coaching.vercel.app avec le son."),
            ]
          : platform === "ios"
            ? [
                t("1. Réglages > Notifications > EP Coaching : autorise, avec Sons et Bannières."),
                t("2. Vérifie qu'un mode Concentration (Ne pas déranger, Sommeil) ne bloque pas l'appli."),
              ]
            : [
                t("1. Paramètres > Applications > Chrome > Batterie : « Sans restriction »."),
                t("2. Si EP Coaching est sur l'écran d'accueil, fais pareil pour elle."),
                t("3. Xiaomi, Oppo, Huawei : active aussi le « Démarrage automatique » de Chrome."),
              ];

  return (
    <div className="mb-4 rounded-2xl border border-(--ep-warn)/40 bg-(--ep-warn)/10 p-3.5">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-start gap-2.5 text-left">
        <AlertTriangle size={16} className="text-(--ep-warn) flex-shrink-0 mt-0.5" />
        <span className="flex-1">
          <span className="block text-[13px] font-bold text-(--ep-strong)">{title}</span>
          <span className="block text-[11.5px] text-(--ep-ink)/60 mt-0.5">
            {problem.kind === "late" || problem.kind === "pending"
              ? t("L'appli l'envoie pile à l'heure, c'est le téléphone qui la bloque pour économiser la batterie. Un réglage d'une minute :")
              : t("Un réglage d'une minute :")}
          </span>
        </span>
        <ChevronDown size={16} className={`text-(--ep-ink)/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2.5 pl-6 space-y-1.5 text-[12px] leading-relaxed text-(--ep-ink)/75">
          {steps.map((s) => (
            <p key={s}>{s}</p>
          ))}
          {(problem.kind === "late" || problem.kind === "pending") && (
            <button
              type="button"
              disabled={test === "…"}
              onClick={async () => {
                setTest("…");
                const res = await scheduleLockedTestPush();
                setTest(res.ok ? res.at ?? "" : "error");
              }}
              className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-bold text-(--ep-accent)"
            >
              <Moon size={12} />
              {test === null && t("Tester appli fermée (notif dans 2 min)")}
              {test === "…" && t("Programmation…")}
              {test === "error" && t("Échec, réessaie")}
              {test && test !== "…" && test !== "error" && t("Prévue à {h} : ferme l'appli et verrouille ton téléphone", { h: test })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
