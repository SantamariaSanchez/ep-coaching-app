"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Footprints, ChevronRight, AlertTriangle, Moon } from "lucide-react";
import InstallAppHint from "@/components/ui/InstallAppHint";
import { PEDOMETER_ENABLED_KEY } from "@/lib/pedometer";
import { setQuietHours } from "@/app/actions/quiet-hours";

// Item 50 : même défaut que lib/quiet-hours.ts côté serveur — affiché tel
// quel tant que l'utilisateur n'a rien choisi explicitement.
const DEFAULT_QUIET_START = 22;
const DEFAULT_QUIET_END = 7;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

// Hub unique pour tout ce que l'appli demande comme autorisations au
// téléphone/navigateur — avant, seules les notifications push avaient un
// vrai écran ; le reste (mouvement pour le podomètre, installation sur
// l'écran d'accueil) était éparpillé ou absent. Le statut du podomètre est
// géré et démarré depuis Pas & routine (composants/steps/StepsClient) — pas
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
  const [push, setPush] = useState(pushSubscribed);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pedometerEnabled, setPedometerEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState(quietHoursStart ?? DEFAULT_QUIET_START);
  const [quietEnd, setQuietEnd] = useState(quietHoursEnd ?? DEFAULT_QUIET_END);
  const [quietSaving, setQuietSaving] = useState(false);
  const [quietSaved, setQuietSaved] = useState(false);

  async function saveQuietHours(start: number, end: number) {
    setQuietStart(start);
    setQuietEnd(end);
    setQuietSaving(true);
    setQuietSaved(false);
    const res = await setQuietHours(start, end);
    setQuietSaving(false);
    if (!res.error) {
      setQuietSaved(true);
      setTimeout(() => setQuietSaved(false), 2000);
    }
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
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-4">Autorisations</p>

      <div className="pb-4 mb-4 border-b border-[#890404]/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Bell size={14} className="text-[#F5EDED]/40 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">Notifications push</p>
              <p className="text-[11px] text-[#F5EDED]/35 mt-0.5">
                {push ? "Activées sur cet appareil" : "Non activées"}
              </p>
            </div>
          </div>
          {push ? (
            <span className="text-[10px] font-bold uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/25 px-2.5 py-1 rounded-full flex-shrink-0">
              Activées
            </span>
          ) : (
            <button
              onClick={enablePush}
              disabled={pushLoading}
              className="flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-colors flex-shrink-0"
            >
              <Bell size={12} /> {pushLoading ? "Activation…" : "Activer"}
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
          <div className="flex items-center gap-2.5 mt-3.5 pt-3.5 border-t border-[#890404]/10">
            <Moon size={13} className="text-[#F5EDED]/30 flex-shrink-0" />
            <span className="text-[11px] text-[#F5EDED]/45 flex-shrink-0">Silence de</span>
            <select
              value={quietStart}
              onChange={(e) => saveQuietHours(Number(e.target.value), quietEnd)}
              disabled={quietSaving}
              className="bg-black/30 border border-[#890404]/25 rounded-md px-1.5 py-1 text-[11px] text-white focus:outline-none"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, "0")}h</option>
              ))}
            </select>
            <span className="text-[11px] text-[#F5EDED]/45">à</span>
            <select
              value={quietEnd}
              onChange={(e) => saveQuietHours(quietStart, Number(e.target.value))}
              disabled={quietSaving}
              className="bg-black/30 border border-[#890404]/25 rounded-md px-1.5 py-1 text-[11px] text-white focus:outline-none"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, "0")}h</option>
              ))}
            </select>
            {quietSaved && <span className="text-[10px] text-green-400 font-semibold">✓</span>}
          </div>
        )}
      </div>

      <Link
        href={stepsHref}
        className="flex items-center justify-between py-1 mb-1 border-b border-[#890404]/10 pb-4 group"
      >
        <div className="flex items-center gap-2.5">
          <Footprints size={14} className="text-[#F5EDED]/40 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">Mouvement (podomètre)</p>
            <p className="text-[11px] text-[#F5EDED]/35 mt-0.5">
              {pedometerEnabled ? "Activé, réglages dans Pas & routine" : "Non activé"}
            </p>
          </div>
        </div>
        <ChevronRight size={13} className="text-[#F5EDED]/20 group-hover:text-[#F5EDED]/50 transition-colors flex-shrink-0" />
      </Link>

      <div className="pt-1">
        <InstallAppHint />
      </div>
    </div>
  );
}
