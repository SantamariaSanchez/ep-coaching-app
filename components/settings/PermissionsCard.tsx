"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Footprints, ChevronRight, AlertTriangle, Moon, Camera, MapPin, Contact, Send } from "lucide-react";
import InstallAppHint from "@/components/ui/InstallAppHint";
import { PEDOMETER_ENABLED_KEY } from "@/lib/pedometer";
import { setQuietHours } from "@/app/actions/quiet-hours";
import { sendTestPush } from "@/app/actions/notifications";

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
  const [push, setPush] = useState(pushSubscribed);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pedometerEnabled, setPedometerEnabled] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [cameraLoading, setCameraLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [locationLoading, setLocationLoading] = useState(false);
  const [contactsSupported, setContactsSupported] = useState(false);
  const [quietStart, setQuietStart] = useState(quietHoursStart ?? DEFAULT_QUIET_START);
  const [quietEnd, setQuietEnd] = useState(quietHoursEnd ?? DEFAULT_QUIET_END);
  const [quietSaving, setQuietSaving] = useState(false);
  const [quietSaved, setQuietSaved] = useState(false);
  const [testPushState, setTestPushState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // Nouveau : vérifier que le push arrive VRAIMENT (son, vibration) sans
  // attendre un vrai événement — voir app/actions/notifications.ts.
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

  // Reflète l'état déjà accordé (autre session, autorisé au niveau OS) sans
  // attendre un clic — même logique que push/pedometer ci-dessus. Le picker
  // de contacts n'a pas de notion d'autorisation persistante (un choix
  // ponctuel à chaque appel), donc seul son support est détecté ici.
  useEffect(() => {
    try {
      const nav = navigator as unknown as { contacts?: { select?: unknown } };
      setContactsSupported(!!nav.contacts?.select);
    } catch {
      // ignore
    }
    (async () => {
      try {
        if (!navigator.permissions?.query) return;
        const cam = await navigator.permissions.query({ name: "camera" as PermissionName });
        setCameraStatus(cam.state === "granted" ? "granted" : cam.state === "denied" ? "denied" : "idle");
        const loc = await navigator.permissions.query({ name: "geolocation" as PermissionName });
        setLocationStatus(loc.state === "granted" ? "granted" : loc.state === "denied" ? "denied" : "idle");
      } catch {
        // Nom de permission non supporté par ce navigateur : on reste sur
        // l'état par défaut, le bouton "Autoriser" gère quand même le cas.
      }
    })();
  }, []);

  async function enableCamera() {
    setCameraLoading(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus("denied");
        return;
      }
      // On ouvre puis on referme immédiatement le flux : le but ici est
      // uniquement de déclencher la demande d'autorisation du navigateur,
      // pas de filmer quoi que ce soit depuis cet écran de réglages.
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setCameraStatus("granted");
    } catch {
      setCameraStatus("denied");
    } finally {
      setCameraLoading(false);
    }
  }

  async function enableLocation() {
    setLocationLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("unsupported"));
          return;
        }
        navigator.geolocation.getCurrentPosition(() => resolve(), () => reject(new Error("denied")), { timeout: 8000 });
      });
      setLocationStatus("granted");
    } catch {
      setLocationStatus("denied");
    } finally {
      setLocationLoading(false);
    }
  }

  async function pickContact() {
    try {
      const nav = navigator as unknown as {
        contacts?: { select: (props: string[], opts: { multiple: boolean }) => Promise<unknown> };
      };
      await nav.contacts?.select(["name", "tel"], { multiple: false });
    } catch {
      // Choix annulé par l'utilisateur ou refusé : rien à faire, ce n'est
      // pas une erreur applicative.
    }
  }

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
              aria-label="Heure de début du silence"
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
              aria-label="Heure de fin du silence"
              className="bg-black/30 border border-[#890404]/25 rounded-md px-1.5 py-1 text-[11px] text-white focus:outline-none"
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
            className="flex items-center gap-1.5 mt-3 text-[11px] font-bold text-[#F5EDED]/40 hover:text-[#E01E1E] disabled:opacity-50 transition-colors"
          >
            <Send size={11} />
            {testPushState === "sending" && "Envoi…"}
            {testPushState === "sent" && "Envoyée — regarde ton appareil"}
            {testPushState === "error" && "Échec, réessaie"}
            {testPushState === "idle" && "M'envoyer une notification de test"}
          </button>
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
              {pedometerEnabled ? "Activé, réglages dans Steps" : "Non activé"}
            </p>
          </div>
        </div>
        <ChevronRight size={13} className="text-[#F5EDED]/20 group-hover:text-[#F5EDED]/50 transition-colors flex-shrink-0" />
      </Link>

      {/* Photos & vidéo, localisation, contacts : mêmes réglages que ceux
          qu'iOS/Android affichent pour n'importe quelle appli installée, un
          navigateur/PWA ne peut demander chacun que via son propre déclencheur
          (caméra, géolocalisation, sélecteur de contacts) — pas de simple
          case à cocher globale côté OS. */}
      <div className="flex items-center justify-between gap-3 py-1 mb-1 border-b border-[#890404]/10 pb-4">
        <div className="flex items-center gap-2.5">
          <Camera size={14} className="text-[#F5EDED]/40 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">Photos & vidéo</p>
            <p className="text-[11px] text-[#F5EDED]/35 mt-0.5">
              {cameraStatus === "granted"
                ? "Autorisées sur cet appareil"
                : cameraStatus === "denied"
                  ? "Refusées, à réactiver dans les réglages du navigateur"
                  : "Utilisées pour filmer tes scripts/vidéos"}
            </p>
          </div>
        </div>
        {cameraStatus === "granted" ? (
          <span className="text-[10px] font-bold uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/25 px-2.5 py-1 rounded-full flex-shrink-0">
            Activées
          </span>
        ) : (
          <button
            onClick={enableCamera}
            disabled={cameraLoading}
            className="flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-colors flex-shrink-0"
          >
            <Camera size={12} /> {cameraLoading ? "Activation…" : "Autoriser"}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 py-1 mb-1 border-b border-[#890404]/10 pb-4">
        <div className="flex items-center gap-2.5">
          <MapPin size={14} className="text-[#F5EDED]/40 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">Localisation</p>
            <p className="text-[11px] text-[#F5EDED]/35 mt-0.5">
              {locationStatus === "granted"
                ? "Autorisée sur cet appareil"
                : locationStatus === "denied"
                  ? "Refusée, à réactiver dans les réglages du navigateur"
                  : "Utilisée pour te proposer une salle/un coach à proximité"}
            </p>
          </div>
        </div>
        {locationStatus === "granted" ? (
          <span className="text-[10px] font-bold uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/25 px-2.5 py-1 rounded-full flex-shrink-0">
            Activée
          </span>
        ) : (
          <button
            onClick={enableLocation}
            disabled={locationLoading}
            className="flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-colors flex-shrink-0"
          >
            <MapPin size={12} /> {locationLoading ? "Activation…" : "Autoriser"}
          </button>
        )}
      </div>

      {contactsSupported && (
        <div className="flex items-center justify-between gap-3 py-1 mb-1 border-b border-[#890404]/10 pb-4">
          <div className="flex items-center gap-2.5">
            <Contact size={14} className="text-[#F5EDED]/40 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">Contacts</p>
              <p className="text-[11px] text-[#F5EDED]/35 mt-0.5">Utilisés pour inviter un proche en parrainage</p>
            </div>
          </div>
          <button
            onClick={pickContact}
            className="flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] text-white text-[11px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-colors flex-shrink-0"
          >
            <Contact size={12} /> Choisir
          </button>
        </div>
      )}

      <div className="pt-1">
        <InstallAppHint />
      </div>
    </div>
  );
}
