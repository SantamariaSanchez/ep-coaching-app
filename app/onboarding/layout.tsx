import { I18nProvider } from "@/components/i18n/I18nProvider";
import LanguageSwitch from "@/components/i18n/LanguageSwitch";
import { getVisitorLocale } from "@/lib/i18n-server";

// Écrans d'avant connexion : en français ou en anglais selon le choix du
// visiteur, sinon la langue de son téléphone.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const locale = await getVisitorLocale();
  return (
    <I18nProvider locale={locale}>
      <LanguageSwitch />
      {children}
    </I18nProvider>
  );
}
