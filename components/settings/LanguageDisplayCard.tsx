"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Languages, Home, Vibrate, SlidersHorizontal, Trophy, ChevronRight } from "lucide-react";
import { LOCALES, type Locale } from "@/lib/i18n";
import { useLocale, useT } from "@/components/i18n/I18nProvider";
import { setLocaleAction } from "@/app/actions/user-settings";
import { setDeviceSetting, useDeviceSettings } from "@/lib/device-settings";
import { CardShell, ChoiceChips, Divider, SettingRow, Toggle } from "@/components/settings/SettingsKit";

const START_PAGES: Record<"coach" | "client", { value: string; label: string }[]> = {
  client: [
    { value: "", label: "Aujourd'hui" },
    { value: "program", label: "Programme" },
    { value: "logbook", label: "Logbook" },
    { value: "nutrition", label: "Nutrition" },
    { value: "performances", label: "Performances" },
    { value: "messages", label: "Messages" },
  ],
  coach: [
    { value: "", label: "Tableau de bord" },
    { value: "clients", label: "Clients" },
    { value: "messages", label: "Messages" },
    { value: "studio", label: "Studio créatif" },
    { value: "moi/programme", label: "Programme" },
    { value: "moi/nutrition", label: "Nutrition" },
  ],
};

// Langue, page d'ouverture, vibrations, et accès direct à la
// personnalisation (Mon appli) et aux disciplines suivies.
export default function LanguageDisplayCard({ space }: { space: "coach" | "client" }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const device = useDeviceSettings();
  const [pending, startTransition] = useTransition();
  const [lang, setLang] = useState<Locale>(locale);
  const base = `/dashboard/${space}`;

  function changeLocale(next: Locale) {
    setLang(next);
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <CardShell>
      <div>
        <SettingRow icon={Languages} title={t("Langue de l'appli")} hint={t("Menus, boutons et réglages. Les contenus écrits par ton coach restent dans leur langue.")} />
        <div style={{ marginTop: 10, opacity: pending ? 0.6 : 1 }}>
          <ChoiceChips
            label={t("Langue de l'appli")}
            value={lang}
            onChange={changeLocale}
            options={LOCALES.map((l) => ({ value: l.value, label: l.native }))}
          />
        </div>
      </div>
      <Divider />
      <div>
        <SettingRow icon={Home} title={t("Page d'ouverture")} hint={t("L'écran qui s'affiche quand tu ouvres l'appli sur cet appareil.")} />
        <div style={{ marginTop: 10 }}>
          <ChoiceChips
            label={t("Page d'ouverture")}
            value={device.startPage}
            onChange={(v) => setDeviceSetting("startPage", v)}
            options={START_PAGES[space].map((o) => ({ value: o.value, label: t(o.label) }))}
          />
        </div>
      </div>
      <Divider />
      <SettingRow icon={Vibrate} title={t("Vibrations de l'interface")} hint={t("Petit retour au toucher quand tu valides une série ou un repas.")} active={device.haptics}>
        <Toggle on={device.haptics} onChange={(v) => setDeviceSetting("haptics", v)} label={t("Vibrations de l'interface")} />
      </SettingRow>
      <Divider />
      <LinkRow href={`${base}/mon-appli`} icon={SlidersHorizontal} title={t("Personnaliser mon appli")} hint={t("Choisis les rubriques affichées : ce que tu n'utilises pas disparaît du menu.")} />
      <LinkRow href={`${base}/${space === "coach" ? "moi/" : ""}performances`} icon={Trophy} title={t("Mes disciplines")} hint={t("Course, Hyrox, CrossFit, force, rééducation, suivi santé.")} />
    </CardShell>
  );
}

function LinkRow({ href, icon, title, hint }: { href: string; icon: React.ElementType; title: string; hint: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <SettingRow icon={icon} title={title} hint={hint}>
        <ChevronRight size={16} style={{ color: "rgba(245,237,237,0.3)" }} />
      </SettingRow>
    </Link>
  );
}
