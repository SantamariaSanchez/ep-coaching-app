// Dit à l'appli qu'elle tourne dans un conteneur natif : les boutons Google et
// Apple utilisent alors le navigateur système et le lien profond (voir
// components/auth/SocialAuthButtons.tsx).
const { contextBridge } = require("electron");
contextBridge.exposeInMainWorld("Capacitor", {
  isNativePlatform: () => true,
  getPlatform: () => "electron",
});
