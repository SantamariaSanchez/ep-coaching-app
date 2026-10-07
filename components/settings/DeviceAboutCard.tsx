"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MonitorSmartphone, RefreshCw, LogOut, Info } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { signOutEverywhereAction } from "@/app/actions/user-settings";
import { CardShell, Divider, SettingRow } from "@/components/settings/SettingsKit";

// Appareil et sessions : vider le cache (appli qui affiche une vieille
// version), se déconnecter partout (téléphone perdu), numéro de version.
export default function DeviceAboutCard({ version, signOutRedirect }: { version: string; signOutRedirect: string }) {
  const t = useT();
  const router = useRouter();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<"cache" | "signout" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function clearCache() {
    setBusy("cache");
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update().catch(() => undefined)));
      }
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  }

  async function signOutEverywhere() {
    const ok = await confirm(t("Tous tes appareils devront se reconnecter, celui-ci compris."), {
      confirmLabel: t("Me déconnecter partout"),
      danger: true,
    });
    if (!ok) return;
    setBusy("signout");
    const res = await signOutEverywhereAction();
    if (res.error) {
      setMsg(t(res.error));
      setBusy(null);
      return;
    }
    router.replace(signOutRedirect);
  }

  const btn: React.CSSProperties = {
    flexShrink: 0, padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
    background: "rgba(245,237,237,0.06)", border: "1px solid rgba(245,237,237,0.1)", color: "#F5EDED",
  };

  return (
    <CardShell>
      <SettingRow icon={RefreshCw} title={t("Vider le cache")} hint={t("Si l'appli affiche une ancienne version ou un écran figé. Tes données ne bougent pas.")}>
        <button type="button" style={btn} disabled={busy !== null} onClick={clearCache}>
          {busy === "cache" ? "..." : t("Vider")}
        </button>
      </SettingRow>
      <Divider />
      <SettingRow icon={LogOut} title={t("Déconnecter tous mes appareils")} hint={t("Téléphone perdu, ordinateur partagé : coupe toutes les sessions ouvertes.")}>
        <button type="button" style={{ ...btn, color: "#f87171", borderColor: "rgba(248,113,113,0.3)" }} disabled={busy !== null} onClick={signOutEverywhere}>
          {busy === "signout" ? "..." : t("Déconnecter")}
        </button>
      </SettingRow>
      {msg && <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>{msg}</p>}
      <Divider />
      <SettingRow icon={MonitorSmartphone} title={t("Cet appareil")} hint={t("Son, vibrations, repos, page d'ouverture et accessibilité sont gardés sur cet appareil.")} />
      <SettingRow icon={Info} title="EP Coaching" hint={`${t("Version")} ${version}`} />
    </CardShell>
  );
}
