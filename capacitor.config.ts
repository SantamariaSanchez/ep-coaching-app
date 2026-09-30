import type { CapacitorConfig } from "@capacitor/cli";

// Appli iOS / Android (lancement App Store, octobre 2026). L'appli native
// charge le site en ligne (toujours à jour sans republier sur les stores)
// et ajoute ce que le web ne sait pas faire : notifications push natives,
// retour haptique, barre d'état, écran de démarrage, liens profonds.
// native/www ne sert que de page de secours hors connexion.
const config: CapacitorConfig = {
  appId: "com.epcoaching.app",
  appName: "EP Coaching",
  webDir: "native/www",
  server: {
    url: "https://ep-coaching.vercel.app/launch",
    cleartext: false,
    allowNavigation: ["ep-coaching.vercel.app", "*.supabase.co", "checkout.stripe.com", "billing.stripe.com"],
    errorPath: "offline.html",
  },
  backgroundColor: "#0D0000",
  ios: {
    contentInset: "never",
    scheme: "EP Coaching",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: "#0D0000",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      launchAutoHide: true,
      backgroundColor: "#0D0000",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0D0000",
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Keyboard: {
      resize: "body",
    },
  },
};

export default config;
