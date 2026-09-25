"use client";

import { useState, useSyncExternalStore } from "react";
import { BellRing } from "lucide-react";

// Active les notifications push de l'espace équipe (nouveau lead, RDV
// booké, paiement reçu...). Même flux complet que components/settings/
// PermissionsCard.tsx : permission navigateur ET abonnement enregistré en
// base, sinon aucun push ne peut partir (voir lib/push.ts).
export default function PushOptIn() {
  const permission = useSyncExternalStore(
    () => () => {},
    () => (typeof Notification === "undefined" || !("serviceWorker" in navigator) ? "unsupported" : Notification.permission),
    () => "unknown"
  );
  const [result, setState] = useState<"granted" | "denied" | null>(null);
  const [busy, setBusy] = useState(false);
  const state = result ?? (permission === "default" ? "prompt" : permission);

  async function enable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState("denied");
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
      setState(res.ok ? "granted" : "denied");
    } catch {
      setState("denied");
    } finally {
      setBusy(false);
    }
  }

  if (state !== "prompt") return null;
  return (
    <div className="ep-card" style={{ padding: "12px 15px", display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
      <BellRing size={18} style={{ color: "#E01E1E", flexShrink: 0 }} />
      <p style={{ flex: 1, fontSize: 12.5, color: "rgba(245,237,237,0.7)", margin: 0, lineHeight: 1.5 }}>
        Active les notifications pour être prévenu à la seconde d&apos;un nouveau lead, d&apos;un RDV booké ou d&apos;un paiement reçu.
      </p>
      <button type="button" onClick={enable} disabled={busy} className="ep-btn-primary" style={{ height: 36, padding: "0 14px", fontSize: 11, flexShrink: 0 }}>
        {busy ? "..." : "Activer"}
      </button>
    </div>
  );
}
