"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDeviceSettings } from "@/lib/device-settings";
import { appearanceThemeColor, currentAppearance } from "@/lib/theme-color";

// Pont avec l'appli native iOS/Android (Capacitor). Ne fait rien dans un
// navigateur. Dans l'appli : barre d'état aux couleurs du thème, bouton retour Android,
// liens profonds, liens externes ouverts dans le navigateur intégré,
// retour haptique sur la navigation et les boutons principaux, et
// enregistrement des notifications push natives.
export default function NativeBridge() {
  const router = useRouter();

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;
      const platform = Capacitor.getPlatform() as "ios" | "android";
      document.documentElement.classList.add("ep-native", `ep-native-${platform}`);

      const [{ StatusBar, Style }, { App }, { Haptics, ImpactStyle }, { Browser }, { SplashScreen }] = await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/app"),
        import("@capacitor/haptics"),
        import("@capacitor/browser"),
        import("@capacitor/splash-screen"),
      ]);
      // Le plugin natif veut une vraie couleur (#RRGGBB) : « var(--ep-bg) »,
      // posé lors du passage aux couleurs de thème, était rejeté et la barre
      // d'état Android restait à sa couleur par défaut. Texte de la barre
      // aussi accordé au fond (clair ou sombre) choisi dans l'apparence.
      const look = currentAppearance();
      StatusBar.setStyle({ style: look.mode === "claire" ? Style.Light : Style.Dark }).catch(() => {});
      if (platform === "android") StatusBar.setBackgroundColor({ color: appearanceThemeColor(look) }).catch(() => {});
      SplashScreen.hide().catch(() => {});

      const back = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else App.minimizeApp().catch(() => {});
      });
      const deep = await App.addListener("appUrlOpen", ({ url }) => {
        // Retour de Google / Apple : referme le navigateur système (iOS).
        Browser.close().catch(() => {});
        try {
          const u = new URL(url);
          if (u.hostname.endsWith("ep-coaching.vercel.app") || u.protocol === "epcoaching:") router.push(`${u.pathname}${u.search}`);
        } catch {
          // lien illisible : ignoré
        }
      });

      const onClick = (e: MouseEvent) => {
        const el = e.target as HTMLElement | null;
        const a = el?.closest("a") as HTMLAnchorElement | null;
        if (a && a.href && a.target === "_blank" && !a.href.startsWith(window.location.origin)) {
          e.preventDefault();
          Browser.open({ url: a.href }).catch(() => {});
          return;
        }
        if (getDeviceSettings().haptics && el?.closest(".ep-nav-tab, .ep-btn-primary, [data-haptic]")) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      };
      document.addEventListener("click", onClick, true);

      // Notifications push natives : seulement une fois Firebase configuré
      // (google-services.json / clé APNs), sinon Android plante au register.
      if (process.env.NEXT_PUBLIC_NATIVE_PUSH !== "1") {
        cleanup = () => {
          back.remove();
          deep.remove();
          document.removeEventListener("click", onClick, true);
        };
        return;
      }
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const reg = await PushNotifications.addListener("registration", (t) => {
        fetch("/api/native-push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: t.value, platform }) }).catch(() => {});
      });
      const tap = await PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
        const url = (a.notification.data as { url?: string } | undefined)?.url;
        if (url && url.startsWith("/")) router.push(url);
      });
      const perm = await PushNotifications.checkPermissions().catch(() => null);
      if (perm?.receive === "granted") PushNotifications.register().catch(() => {});
      else if (perm?.receive === "prompt") {
        const asked = await PushNotifications.requestPermissions().catch(() => null);
        if (asked?.receive === "granted") PushNotifications.register().catch(() => {});
      }

      cleanup = () => {
        back.remove();
        deep.remove();
        reg.remove();
        tap.remove();
        document.removeEventListener("click", onClick, true);
      };
    })();
    return () => cleanup?.();
  }, [router]);

  return null;
}
