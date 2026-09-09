"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Camera, MapPin, Check, X } from "lucide-react";

// Demande d'autorisations au premier lancement, comme une vraie application.
//
// Retour direct (2026-09-08) : "quand j'avais dit qu'il fallait que l'appli
// demande les autorisations, je veux dire que ça doit être demandé dans les
// paramètres de l'appli du téléphone [...] et sur mon appli il y a 0
// autorisation qu'on demande".
//
// Le point technique qui explique ce constat : Android (comme iOS) ne liste une
// autorisation dans Réglages > Applications > EP Coaching > Autorisations que si
// l'application l'a réellement demandée au moins une fois. Un site ou une PWA ne
// peut pas pré-remplir cette liste : elle se remplit quand le code appelle
// vraiment l'API correspondante (Notification.requestPermission, getUserMedia,
// geolocation), ce qui ouvre le vrai dialogue système du téléphone.
//
// L'écran d'autorisations existant vivait dans un onglet Paramètres de l'appli,
// donc en pratique jamais ouvert : aucune demande n'était jamais déclenchée, et
// le téléphone n'affichait donc aucune autorisation. Ce composant règle ça en
// posant la question au premier lancement, une seule fois, avec un vrai
// dialogue système par autorisation.

const STORAGE_KEY = "ep-permissions-primer-done";

type Status = "idle" | "granted" | "denied";

export default function PermissionsPrimer() {
  const [show, setShow] = useState(false);
  const [notif, setNotif] = useState<Status>("idle");
  const [camera, setCamera] = useState<Status>("idle");
  const [location, setLocation] = useState<Status>("idle");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
      // Rien à demander si le navigateur a déjà tout accordé (cas d'un compte
      // qui réinstalle l'appli sur un téléphone où les autorisations sont déjà
      // en place) : inutile d'ouvrir un écran pour ne rien faire.
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        localStorage.setItem(STORAGE_KEY, "1");
        return;
      }
      setShow(true);
    } catch {
      // localStorage indisponible (navigation privée stricte) : on n'insiste pas.
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setShow(false);
  }, []);

  // Bug réel trouvé en creusant le retour direct 2026-09-09 ("les notif...
  // ba y'a toujours aucun son", "aussi les autorisation bug") : cette
  // fonction ne faisait QUE Notification.requestPermission(), jamais
  // l'abonnement push réel (pushManager.subscribe + enregistrement en base
  // via /api/push/subscribe, voir components/settings/PermissionsCard.tsx
  // enablePush, la vraie référence). Résultat : "Notifications" passait au
  // vert "OK" ici (la permission navigateur est bien accordée) sans qu'un
  // seul push ne puisse jamais partir — sendPushToUser (lib/push.ts) exige
  // une ligne dans push_subscriptions, jamais créée par ce composant. Un
  // utilisateur qui ne passe QUE par cet écran (premier lancement) croyait
  // donc avoir activé ses rappels/réveil alors que rien n'était vraiment
  // abonné. Même flux complet que PermissionsCard.enablePush ici.
  async function askNotifications() {
    setBusy("notif");
    try {
      if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
        setNotif("denied");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotif("denied");
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
      setNotif(res.ok ? "granted" : "denied");
    } catch {
      setNotif("denied");
    } finally {
      setBusy(null);
    }
  }

  async function askCamera() {
    setBusy("camera");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamera("denied");
        return;
      }
      // Flux ouvert puis refermé immédiatement : le but est uniquement de
      // déclencher le dialogue système, pas de filmer depuis cet écran.
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setCamera("granted");
    } catch {
      setCamera("denied");
    } finally {
      setBusy(null);
    }
  }

  async function askLocation() {
    setBusy("location");
    try {
      await new Promise<void>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("unsupported"));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          () => resolve(),
          () => reject(new Error("denied")),
          { timeout: 8000 }
        );
      });
      setLocation("granted");
    } catch {
      setLocation("denied");
    } finally {
      setBusy(null);
    }
  }

  if (!show) return null;

  const rows: {
    key: string;
    icon: typeof Bell;
    title: string;
    why: string;
    status: Status;
    ask: () => Promise<void>;
  }[] = [
    {
      key: "notif",
      icon: Bell,
      title: "Notifications",
      why: "Tes rappels d'agenda, de repas et de séance à l'heure prévue.",
      status: notif,
      ask: askNotifications,
    },
    {
      key: "camera",
      icon: Camera,
      title: "Photos & vidéo",
      why: "Tes photos de progression et tes vidéos de technique.",
      status: camera,
      ask: askCamera,
    },
    {
      key: "location",
      icon: MapPin,
      title: "Localisation",
      why: "Trouver une salle proche de toi.",
      status: location,
      ask: askLocation,
    },
  ];

  return (
    <div
      role="dialog"
      aria-label="Autorisations de l'application"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div className="w-full sm:max-w-md bg-[#150000] border border-[#890404]/40 rounded-t-2xl sm:rounded-2xl sm:mb-8 p-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <p className="text-sm font-black uppercase tracking-widest text-white">Autoriser l&apos;appli</p>
          <button onClick={dismiss} aria-label="Plus tard" className="text-[#F5EDED]/40 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <p className="text-[11.5px] text-[#F5EDED]/45 leading-relaxed mb-4">
          Trois autorisations, chacune pour une raison précise. Tu peux tout refuser, l&apos;appli
          fonctionne quand même.
        </p>

        <div className="space-y-2 mb-4">
          {rows.map(({ key, icon: Icon, title, why, status, ask }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 bg-[#1f0101] border border-[#890404]/20 rounded-xl p-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon size={15} className="text-[#F5EDED]/40 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-white">{title}</p>
                  <p className="text-[11px] text-[#F5EDED]/40 leading-snug">{why}</p>
                </div>
              </div>
              {status === "granted" ? (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-green-400 flex-shrink-0">
                  <Check size={12} /> OK
                </span>
              ) : status === "denied" ? (
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 flex-shrink-0">
                  Refusé
                </span>
              ) : (
                <button
                  onClick={ask}
                  disabled={busy !== null}
                  className="bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-colors flex-shrink-0"
                >
                  {busy === key ? "…" : "Autoriser"}
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={dismiss}
          className="w-full py-2.5 text-[11px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors"
        >
          Terminer
        </button>
      </div>
    </div>
  );
}
