// EP Coaching pour ordinateur : une fenêtre Electron qui charge l'appli en
// ligne (toujours à jour, comme l'appli mobile Capacitor). Rien n'est stocké
// ici, aucune clé. Google et Apple refusent les fenêtres intégrées : leurs
// pages s'ouvrent dans le navigateur, le retour se fait par le lien
// epcoaching://app/... (voir lib/oauth.ts, NATIVE_DEEP_LINK).
const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

const SITE = "https://ep-coaching.vercel.app";
const HOSTS = new Set(["ep-coaching.vercel.app"]);
let win = null;

function toSiteUrl(deepLink) {
  try {
    const u = new URL(deepLink);
    return `${SITE}${u.pathname}${u.search}`;
  } catch {
    return `${SITE}/launch`;
  }
}

function createWindow(url) {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0D0000",
    title: "EP Coaching",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: true },
  });
  win.removeMenu();
  win.loadURL(url || `${SITE}/launch`);
  // Tout ce qui n'est pas EP Coaching (Google, Apple, Stripe, liens externes) s'ouvre dans le navigateur.
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    shell.openExternal(target);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, target) => {
    if (!HOSTS.has(new URL(target).hostname)) {
      e.preventDefault();
      shell.openExternal(target);
    }
  });
  win.on("closed", () => { win = null; });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.setAsDefaultProtocolClient("epcoaching");
  // Windows et Linux : le lien profond arrive dans la ligne de commande de la 2e instance.
  app.on("second-instance", (_e, argv) => {
    const link = argv.find((a) => a.startsWith("epcoaching://"));
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
      if (link) win.loadURL(toSiteUrl(link));
    }
  });
  // Mac : lien profond.
  app.on("open-url", (e, link) => {
    e.preventDefault();
    if (win) win.loadURL(toSiteUrl(link));
    else app.whenReady().then(() => createWindow(toSiteUrl(link)));
  });
  app.whenReady().then(() => createWindow());
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
  app.on("activate", () => { if (!win) createWindow(); });
}
