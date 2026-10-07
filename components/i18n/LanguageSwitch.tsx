"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/I18nProvider";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

// Choix FR / EN sur les écrans d'avant connexion. Le choix est gardé dans
// un cookie puis repris sur le compte dès la connexion.
export default function LanguageSwitch() {
  const locale = useLocale();
  const router = useRouter();
  const pick = (l: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return (
    <div
      role="radiogroup"
      aria-label="Langue / Language"
      style={{ position: "fixed", top: "calc(env(safe-area-inset-top) + 12px)", right: 12, zIndex: 50, display: "flex", gap: 2, padding: 3, borderRadius: 999, background: "rgba(13,0,0,0.7)", border: "1px solid rgba(245,237,237,0.12)", backdropFilter: "blur(12px)" }}
    >
      {(["fr", "en"] as Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={locale === l}
          onClick={() => pick(l)}
          style={{ minWidth: 40, minHeight: 32, borderRadius: 999, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", background: locale === l ? "#E01E1E" : "transparent", color: locale === l ? "#fff" : "rgba(245,237,237,0.6)" }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
