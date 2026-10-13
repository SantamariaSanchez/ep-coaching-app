"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Footprints, ChevronRight, AlertTriangle, Moon, Send, Smartphone } from "lucide-react";
import InstallAppHint from "@/components/ui/InstallAppHint";
import { PEDOMETER_ENABLED_KEY } from "@/lib/pedometer";
import { setQuietHours } from "@/app/actions/quiet-hours";
import { sendTestPush, scheduleLockedTestPush } from "@/app/actions/notifications";

// Item 50 : même défaut que lib/quiet-hours.ts côté serveur — affiché tel
// quel tant que l'utilisateur n'a rien choisi explicitement.
const DEFAULT_QUIET_START = 22;
const DEFAULT_QUIET_END = 7;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

// Hub unique pour tout ce que l'appli demande comme autorisations au
// téléphone/navigateur — avant, seules les notifications push avaient un
// vrai écran ; le reste (mouvement pour le podomètre, installation sur
// l'écran d'accueil) était éparpillé ou absent. Le statut du podomètre est
// géré et démarré depuis Steps (composants/steps/StepsClient) — pas
// dupliqué ici, on se contente de l'état lu en localStorage + un lien.
export default function PermissionsCard({
  pushSubscribed,
  stepsHref,
  quietHoursStart = null,
  quietHoursEnd = null,
}: {
  pushSubscribed: boolean;
  stepsHref: string;
  quietHoursStart?: number | null;
  quietHoursEnd?: number | null;
}) {
  const tr = useT();
  const [push, setPush] = useState(pushSubscribed);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pedometerEnabled, setPedometerEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState(quietHoursStart ?? DEFAULT_QUIET_START);
  const [quietEnd, setQuietEnd] = useState(quietHoursEnd ?? DEFAULT_QUIET_END);
  const [quietSaving, setQuietSaving] = useState(false);
  const [quietSaved, setQuietSaved] = useState(false);
  const [testPushState, setTestPushState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // Nouveau : vérifier que le push arrive VRAIMENT (son, vibration) sans
  // attendre un vrai événement — voir app/actions/notifications.ts.
  const [lockedTest, setLockedTest] = useState<string | null>(null);
  const [showAndroidHelp, setShowAndroidHelp] = useState(false);
  async function handleLockedTest() {
    setLockedTest("…");
    const res = await scheduleLockedTestPush();
    setLockedTest(res.ok ? res.at ?? "" : "error");
  }

  async function handleTestPush() {
    setTestPushState("sending");
    const res = await sendTestPush();
    setTestPushState(res.ok ? "sent" : "error");
    setTimeout(() => setTestPushState("idle"), 3000);
  }

  // MASTERCLASS.md Axe E : sans ça, un état changé ailleurs (autre appareil,
  // autre onglet) restait invisible tant que le composant ne remontait pas.
  useEffect(() => {
    setPush(pushSubscribed);
  }, [pushSubscribed]);
  // Multi-appareils (2026-10-08) : « Activées » doit dire si CET appareil
  // reçoit les notifications, pas seulement qu'un autre appareil du compte
  // les reçoit. Sinon le téléphone affichait « activées » sans rien recevoir.
  useEffect(() => {
    (async () => {
      try {
        if (!("serviceWorker" in navigator) || typeof Notification === "undefined") return;
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        setPush(Notification.permission === "granted" && !!sub);
      } catch {}
    })();
  }, []);
  useEffect(() => {
    setQuietStart(quietHoursStart ?? DEFAULT_QUIET_START);
    setQuietEnd(quietHoursEnd ?? DEFAULT_QUIET_END);
  }, [quietHoursStart, quietHoursEnd]);

  async function saveQuietHours(start: number, end: number) {
    const previousStart = quietStart;
    const previousEnd = quietEnd;
    setQuietStart(start);
    setQuietEnd(end);
    setQuietSaving(true);
    setQuietSaved(false);
    const res = await setQuietHours(start, end);
    setQuietSaving(false);
    if (res.error) {
      // MASTERCLASS.md Axe B : sans ça, un échec serveur laissait affichées
      // les heures qui viennent d'être choisies alors qu'elles n'ont pas
      // été enregistrées.
      setQuietStart(previousStart);
      setQuietEnd(previousEnd);
      return;
    }
    setQuietSaved(true);
    setTimeout(() => setQuietSaved(false), 2000);
  }

  // localStorage n'existe pas côté serveur : lire cette valeur pendant le
  // rendu (même via un initialiseur "lazy") produirait un mismatch
  // d'hydratation (le HTML serveur ne peut pas connaître ce que ce navigateur
  // a stocké) — même compromis assumé que setIsDesktop dans DashboardNav.
  useEffect(() => {
    try {
      setPedometerEnabled(localStorage.getItem(PEDOMETER_ENABLED_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  // Même mécanique que l'ancien bouton dans AccountActions — voir ce fichier
  // dans l'historique git pour le contexte complet sur pourquoi chaque étape
  // gère explicitement ses erreurs.
  async function enablePush() {
    setPushLoading(true);
    setPushError(null);
    try {
      if (!("serviceWorker" in navigator)) {
        setPushError("Ton navigateur ne supporte pas les notifications push.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushError(
          permission === "denied"
            ? "Notifications bloquées. Autorise-les dans les réglages de ton navigateur pour ce site, puis réessaie."
            : "Activation annulée."
        );
        return;
      }
      const b64 = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const pad = "=".repeat((4 - (b64.length % 4)) % 4);
      const raw = window.atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
      const key = Uint8Array.from([...raw].map((c) => c.charCodeAt(0))).buffer as ArrayBuffer;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) {
        setPushError("Erreur lors de l'enregistrement. Réessaie.");
        return;
      }
      setPush(true);
    } catch (e) {
      console.error(e);
      setPushError("Erreur lors de l'activation. Réessaie.");
    } finally {
      setPushLoading(false);
    }
  }

  return (
    <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl p-5 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-4">{tr("Autorisations")}</p>

      <div className="pb-4 mb-4 border-b border-(--ep-line)/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Bell size={14} className="text-(--ep-ink)/40 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-(--ep-strong)">{tr("Notifications push")}</p>
              <p className="text-[11px] text-(--ep-ink)/35 mt-0.5">
                {push ? tr("Activées sur cet appareil") : tr("À activer dans Réglages > Applications > EP Coaching > Notifications")}
              </p>
            </div>
          </div>
          {push ? (
            <span className="text-[10px] font-bold uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/25 px-2.5 py-1 rounded-full flex-shrink-0">
              {tr("Activées")}
            </span>
          ) : (
            <button
              onClick={enablePush}
              disabled={pushLoading}
              className="flex items-center gap-1.5 bg-(--ep-accent) hover:bg-(--ep-accent-2) disabled:opacity-50 text-(--ep-strong) text-[11px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-colors flex-shrink-0"
            >
              <Bell size={12} /> {pushLoading ? tr("Activation…") : tr("Activer")}
            </button>
          )}
        </div>
        {pushError && (
          <p className="flex items-start gap-1.5 text-[11px] text-red-400 mt-2.5 leading-relaxed">
            <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" /> {pushError}
          </p>
        )}

        {/* Item 50 : n'a de sens que si le push est activé — coupe
            uniquement le son/la vibration la nuit, jamais la notif in-app. */}
        {push && (
          <div className="flex items-center gap-2.5 mt-3.5 pt-3.5 border-t border-(--ep-line)/10">
            <Moon size={13} className="text-(--ep-ink)/30 flex-shrink-0" />
            <span className="text-[11px] text-(--ep-ink)/45 flex-shrink-0">{tr("Silence de")}</span>
            <select
              value={quietStart}
              onChange={(e) => saveQuietHours(Number(e.target.value), quietEnd)}
              disabled={quietSaving}
              aria-label={tr("Heure de début du silence")}
              className="bg-(--ep-shade)/30 border border-(--ep-line)/25 rounded-md px-1.5 py-1 text-[11px] text-(--ep-strong) focus:outline-none"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, "0")}h</option>
              ))}
            </select>
            <span className="text-[11px] text-(--ep-ink)/45">à</span>
            <select
              value={quietEnd}
              onChange={(e) => saveQuietHours(quietStart, Number(e.target.value))}
              disabled={quietSaving}
              aria-label={tr("Heure de fin du silence")}
              className="bg-(--ep-shade)/30 border border-(--ep-line)/25 rounded-md px-1.5 py-1 text-[11px] text-(--ep-strong) focus:outline-none"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, "0")}h</option>
              ))}
            </select>
            {quietSaved && <span className="text-[10px] text-green-400 font-semibold">✓</span>}
          </div>
        )}

        {/* Nouveau : aucun moyen jusqu'ici de vérifier que le push arrive
            VRAIMENT (son, vibration, bannière) sans attendre un vrai
            événement — pertinent après l'historique "réveil sans son". */}
        {push && (
          <button
            onClick={handleTestPush}
            disabled={testPushState === "sending"}
            className="flex items-center gap-1.5 mt-3 text-[11px] font-bold text-(--ep-ink)/40 hover:text-(--ep-accent) disabled:opacity-50 transition-colors"
          >
            <Send size={11} />
            {testPushState === "sending" && tr("Envoi…")}
            {testPushState === "sent" && tr("Envoyée, regarde ton appareil")}
            {testPushState === "error" && tr("Échec, réessaie")}
            {testPushState === "idle" && tr("M'envoyer une notification de test")}
          </button>
        )}

        {/* Test appli fermée + aide Android (2026-10-08) : la notif part
            pile à l'heure côté serveur ; si elle n'arrive qu'à l'ouverture,
            c'est l'économie de batterie du téléphone qui endort Chrome. */}
        {push && (
          <button
            onClick={handleLockedTest}
            disabled={lockedTest === "…"}
            className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-(--ep-ink)/40 hover:text-(--ep-accent) disabled:opacity-50 transition-colors text-left"
          >
            <Moon size={11} />
            {lockedTest === null && tr("Tester appli fermée (notif dans 2 min)")}
            {lockedTest === "…" && tr("Programmation…")}
            {lockedTest === "error" && tr("Échec, réessaie")}
            {lockedTest && lockedTest !== "…" && lockedTest !== "error" && tr("Prévue à {h} : ferme l'appli et verrouille ton téléphone", { h: lockedTest })}
          </button>
        )}
        {push && (
          <div className="mt-2">
            <button
              onClick={() => setShowAndroidHelp((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-(--ep-ink)/40 hover:text-(--ep-accent) transition-colors"
            >
              <AlertTriangle size={11} />
              {tr("Les notifs arrivent seulement quand j'ouvre l'appli")}
            </button>
            {showAndroidHelp && (
              <div className="mt-2 rounded-lg border border-(--ep-line)/25 bg-(--ep-shade)/30 p-3 text-[11.5px] leading-relaxed text-(--ep-ink)/70 space-y-1.5">
                <p>{tr("L'appli envoie bien chaque notif à l'heure. Si elle n'arrive qu'à l'ouverture, ton téléphone endort Chrome pour économiser la batterie. À régler une seule fois :")}</p>
                <p>{tr("1. Paramètres > Applications > Chrome > Batterie : choisis « Sans restriction » (ou « Non optimisée »).")}</p>
                <p>{tr("2. Si l'appli EP Coaching est installée sur l'écran d'accueil, fais pareil pour elle.")}</p>
                <p>{tr("3. Samsung : Paramètres > Batterie > Limites d'utilisation en arrière-plan, retire Chrome des applis en veille.")}</p>
                <p>{tr("4. Xiaomi, Oppo, Huawei : active aussi le « Démarrage automatique » de Chrome.")}</p>
                <p>{tr("5. Paramètres > Notifications > Chrome : autorise les notifications de ep-coaching.vercel.app avec le son.")}</p>
                <p>{tr("Puis touche « Tester appli fermée » et verrouille ton téléphone.")}</p>
              </div>
            )}
          </div>
        )}

        {/* Retour direct 2026-09-10 ("les notifs, corrige, j'en reçois
            toujours pas") : le badge "Activées" ci-dessus reste vert tant
            qu'une ligne push_subscriptions existe côté serveur, même si
            l'abonnement est en réalité mort côté téléphone (OS qui a
            silencieusement révoqué la permission, appli réinstallée,
            abonnement resté sur un ancien appareil...) — jusqu'ici, dans ce
            cas précis, il n'y avait AUCUN moyen de se réabonner soi-même :
            le bouton "Activer" n'était rendu QUE quand push=false. Ce lien
            relance exactement le même enablePush() qui écrase l'ancien
            abonnement par un nouveau (voir /api/push/subscribe), sans
            attendre une intervention manuelle en base à chaque fois. */}
        {push && (
          <button
            onClick={enablePush}
            disabled={pushLoading}
            className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-(--ep-ink)/40 hover:text-(--ep-accent) disabled:opacity-50 transition-colors"
          >
            <Bell size={11} />
            {pushLoading ? tr("Réactivation…") : tr("Le test n'arrive pas ? Réactiver les notifications")}
          </button>
        )}
      </div>

      <Link
        href={stepsHref}
        className="flex items-center justify-between py-1 mb-1 border-b border-(--ep-line)/10 pb-4 group"
      >
        <div className="flex items-center gap-2.5">
          <Footprints size={14} className="text-(--ep-ink)/40 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-(--ep-strong)">{tr("Mouvement (podomètre)")}</p>
            <p className="text-[11px] text-(--ep-ink)/35 mt-0.5">
              {pedometerEnabled ? tr("Activé, réglages dans Steps") : tr("Non activé")}
            </p>
          </div>
        </div>
        <ChevronRight size={13} className="text-(--ep-ink)/20 group-hover:text-(--ep-ink)/50 transition-colors flex-shrink-0" />
      </Link>

      {/* Caméra, photos, micro, localisation : plus de boutons « Autoriser »
          dans l'appli (2026-10-13). Le téléphone demande lui-même au moment où
          la fonction sert, et tout se règle dans les réglages du téléphone. */}
      <div className="flex items-start gap-2.5 py-1 mb-1 border-b border-(--ep-line)/10 pb-4">
        <Smartphone size={14} className="text-(--ep-ink)/40 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-(--ep-strong)">{tr("Caméra, photos, micro, localisation")}</p>
          <p className="text-[11.5px] text-(--ep-ink)/45 mt-0.5 leading-relaxed">
            {tr("Ton téléphone te les demande la première fois que tu t'en sers (photo de progression, vidéo de technique, dictée). Pour les modifier : Réglages du téléphone > Applications > EP Coaching > Autorisations.")}
          </p>
        </div>
      </div>

      <div className="pt-1">
        <InstallAppHint />
      </div>
    </div>
  );
}
