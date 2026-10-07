"use client";

import { useState } from "react";
import { MonitorSmartphone, RefreshCw, Info } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { CardShell, Divider, SettingRow } from "@/components/settings/SettingsKit";

// Appareil : vider le cache (appli qui affiche une vieille version) et
// numéro de version. La déconnexion de tous les appareils est déjà dans
// Compte (AccountActions), pas de doublon ici.
export default function DeviceAboutCard({ version }: { version: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function clearCache() {
    setBusy(true);
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

  return (
    <CardShell>
      <SettingRow icon={RefreshCw} title={t("Vider le cache")} hint={t("Si l'appli affiche une ancienne version ou un écran figé. Tes données ne bougent pas.")}>
        <button
          type="button"
          disabled={busy}
          onClick={clearCache}
          style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "rgba(245,237,237,0.06)", border: "1px solid rgba(245,237,237,0.1)", color: "#F5EDED" }}
        >
          {busy ? "..." : t("Vider")}
        </button>
      </SettingRow>
      <Divider />
      <SettingRow icon={MonitorSmartphone} title={t("Cet appareil")} hint={t("Son, vibrations, repos, page d'ouverture et accessibilité sont gardés sur cet appareil.")} />
      <SettingRow icon={Info} title={t("EP Coaching")} hint={`${t("Version")} ${version}`} />
    </CardShell>
  );
}
