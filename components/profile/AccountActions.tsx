"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Lock, LogOut, ChevronRight } from "lucide-react";
import { createClientSupabase } from "@/lib/supabase-client";
import InstallAppHint from "@/components/ui/InstallAppHint";

export default function AccountActions({
  email,
  signOutRedirect,
  pushSubscribed,
}: {
  email: string | null;
  signOutRedirect: string;
  pushSubscribed: boolean;
}) {
  const router = useRouter();
  const sb = createClientSupabase();
  const [push, setPush] = useState(pushSubscribed);
  const [resetSent, setResetSent] = useState(false);

  async function signOut() {
    await sb.auth.signOut();
    router.push(signOutRedirect);
    router.refresh();
  }

  async function resetPwd() {
    if (!email) return;
    await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${signOutRedirect}`,
    });
    setResetSent(true);
  }

  async function enablePush() {
    try {
      if (!("serviceWorker" in navigator)) return;
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      if ((await Notification.requestPermission()) !== "granted") return;
      const b64 = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const pad = "=".repeat((4 - (b64.length % 4)) % 4);
      const raw = window.atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
      const key = Uint8Array.from([...raw].map((c) => c.charCodeAt(0))).buffer as ArrayBuffer;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      setPush(true);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-4">Compte</p>

      <div className="flex items-center justify-between gap-3 pb-4 mb-1 border-b border-[#890404]/10">
        <div>
          <p className="text-sm font-semibold text-white">Notifications push</p>
          <p className="text-[11px] text-[#F5EDED]/35 mt-0.5">
            {push ? "Activées sur cet appareil" : "Non activées"}
          </p>
        </div>
        {push ? (
          <span className="text-[10px] font-bold uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/25 px-2.5 py-1 rounded-full">
            Activées
          </span>
        ) : (
          <button
            onClick={enablePush}
            className="flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] text-white text-[11px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-colors"
          >
            <Bell size={12} /> Activer
          </button>
        )}
      </div>

      <button
        onClick={resetPwd}
        className="flex items-center justify-between w-full py-3 border-b border-[#890404]/10"
      >
        <div className="flex items-center gap-2.5">
          <Lock size={14} className="text-[#F5EDED]/40" />
          <span className="text-sm text-white font-medium">
            {resetSent ? "Email envoyé !" : "Changer mon mot de passe"}
          </span>
        </div>
        <ChevronRight size={13} className="text-[#F5EDED]/20" />
      </button>

      <button
        onClick={signOut}
        className="flex items-center justify-center gap-2 w-full mt-4 bg-[#E01E1E]/10 border border-[#E01E1E]/25 hover:bg-[#E01E1E]/20 rounded-lg py-3 text-[#E01E1E] font-bold text-xs uppercase tracking-widest transition-colors"
      >
        <LogOut size={13} /> Se déconnecter
      </button>

      <div className="mt-3">
        <InstallAppHint />
      </div>
    </div>
  );
}
