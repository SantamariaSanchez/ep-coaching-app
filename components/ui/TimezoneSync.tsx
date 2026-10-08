"use client";

import { useEffect } from "react";
import { setTimezoneAction } from "@/app/actions/user-settings";

const KEY = "ep-timezone-v1";

// Envoie le fuseau horaire de l'appareil quand il change (voyage, nouveau
// téléphone) : les rappels partent ainsi à l'heure locale de la personne.
export default function TimezoneSync() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz || localStorage.getItem(KEY) === tz) return;
      setTimezoneAction(tz).then((res) => {
        if (!res.error) localStorage.setItem(KEY, tz);
      });
    } catch {}
  }, []);
  return null;
}
