"use client";

import { useState } from "react";
import { Timer, Volume2, Vibrate, ShoppingBasket } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { setDeviceSetting, useDeviceSettings } from "@/lib/device-settings";
import { setPantryAutoAction } from "@/app/actions/user-settings";
import { CardShell, ChoiceChips, Divider, SettingRow, Toggle } from "@/components/settings/SettingsKit";

const REST_OPTIONS = [0, 60, 90, 120, 180, 240];

// Réglages utilisés pendant la séance (minuteur de repos) et dans les
// courses (le stock baisse quand on enregistre un repas).
export default function TrainingNutritionCard({ initialPantryAuto }: { initialPantryAuto: boolean }) {
  const t = useT();
  const device = useDeviceSettings();
  const [pantryAuto, setPantryAuto] = useState(initialPantryAuto);
  const [error, setError] = useState<string | null>(null);

  async function changePantry(v: boolean) {
    setPantryAuto(v);
    setError(null);
    const res = await setPantryAutoAction(v);
    if (res.error) {
      setPantryAuto(!v);
      setError(t(res.error));
    }
  }

  const restLabel = (s: number) => (s === 0 ? t("Auto") : s < 120 ? `${s} s` : `${s / 60} min`);

  return (
    <CardShell>
      <div>
        <SettingRow icon={Timer} title={t("Repos par défaut")} hint={t("Quand le programme ne fixe pas de repos. Auto : plus long si la série était proche de l'échec.")} />
        <div style={{ marginTop: 10 }}>
          <ChoiceChips
            label={t("Repos par défaut")}
            value={device.restDefaultSeconds}
            onChange={(v) => setDeviceSetting("restDefaultSeconds", v)}
            options={REST_OPTIONS.map((s) => ({ value: s, label: restLabel(s) }))}
          />
        </div>
      </div>
      <Divider />
      <SettingRow icon={Volume2} title={t("Son en fin de repos")} hint={t("Un bip quand le minuteur arrive à zéro.")} active={device.restSound}>
        <Toggle on={device.restSound} onChange={(v) => setDeviceSetting("restSound", v)} label={t("Son en fin de repos")} />
      </SettingRow>
      <SettingRow icon={Vibrate} title={t("Vibration en fin de repos")} hint={t("Le téléphone vibre, pratique avec des écouteurs.")} active={device.restVibration}>
        <Toggle on={device.restVibration} onChange={(v) => setDeviceSetting("restVibration", v)} label={t("Vibration en fin de repos")} />
      </SettingRow>
      <Divider />
      <SettingRow
        icon={ShoppingBasket}
        title={t("Stock de courses automatique")}
        hint={t("Quand tu notes un repas, les aliments en stock baissent tout seuls (ex. 3 bananes achetées, 1 mangée, il en reste 2).")}
        active={pantryAuto}
      >
        <Toggle on={pantryAuto} onChange={changePantry} label={t("Stock de courses automatique")} />
      </SettingRow>
      {error && <p style={{ margin: 0, fontSize: 12, color: "#f87171" }}>{error}</p>}
      <p style={{ margin: 0, fontSize: 11, color: "rgba(245,237,237,0.35)", lineHeight: 1.5 }}>
        {t("Le minuteur et les vibrations sont réglés pour cet appareil. Le stock suit ton compte.")}
      </p>
    </CardShell>
  );
}
