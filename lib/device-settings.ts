"use client";

// Réglages propres à un appareil (2026-10-07) : son et vibration en fin de
// repos, repos par défaut, vibrations de l'interface, page d'ouverture. Ils
// vivent dans le stockage local (comme sur toute appli mobile, chaque
// téléphone garde les siens) ; la page d'ouverture est aussi copiée dans un
// cookie pour que le serveur ouvre directement la bonne page au lancement.
import { useSyncExternalStore } from "react";

export interface DeviceSettings {
  restSound: boolean;
  restVibration: boolean;
  /** 0 = automatique selon l'effort (RIR), sinon des secondes. */
  restDefaultSeconds: number;
  haptics: boolean;
  startPage: string;
}

export const DEVICE_DEFAULTS: DeviceSettings = {
  restSound: true,
  restVibration: true,
  restDefaultSeconds: 0,
  haptics: true,
  startPage: "",
};

const KEY = "ep-device-settings-v1";
const EVENT = "ep:device-settings";

function read(): DeviceSettings {
  if (typeof window === "undefined") return DEVICE_DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEVICE_DEFAULTS, ...JSON.parse(raw) } : DEVICE_DEFAULTS;
  } catch {
    return DEVICE_DEFAULTS;
  }
}

let cache: DeviceSettings | null = null;
let cacheRaw: string | null = null;

function snapshot(): DeviceSettings {
  if (typeof window === "undefined") return DEVICE_DEFAULTS;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (cache && raw === cacheRaw) return cache;
  cacheRaw = raw;
  cache = read();
  return cache;
}

export function getDeviceSettings(): DeviceSettings {
  return snapshot();
}

export function setDeviceSetting<K extends keyof DeviceSettings>(key: K, value: DeviceSettings[K]) {
  const next = { ...read(), [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  if (key === "startPage") {
    const v = String(value);
    document.cookie = v ? `ep-start=${encodeURIComponent(v)}; path=/; max-age=31536000; samesite=lax` : "ep-start=; path=/; max-age=0";
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Lecture réactive ; valeurs par défaut au rendu serveur pour éviter tout écart. */
export function useDeviceSettings(): DeviceSettings {
  return useSyncExternalStore(subscribe, snapshot, () => DEVICE_DEFAULTS);
}
