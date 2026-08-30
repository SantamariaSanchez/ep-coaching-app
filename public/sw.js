// EP Coaching Service Worker — push notifications

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  const isAlarm = data.type === "alarm";

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title || "EP Coaching", {
        body: data.body || "Nouveau message",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { url: data.url || "/", type: data.type },
        // Un réveil (type "alarm") doit rester affiché tant qu'il n'est pas
        // explicitement fermé/traité — sans ça, la notif peut disparaître
        // toute seule après quelques secondes sur certains appareils et
        // passer complètement inaperçue pendant le sommeil.
        requireInteraction: isAlarm,
        vibrate: isAlarm ? [400, 200, 400, 200, 400, 200, 400] : undefined,
        actions: isAlarm ? [{ action: "stop-alarm", title: "Arrêter" }] : undefined,
        silent: false,
        tag: isAlarm ? "ep-coaching-alarm" : undefined,
      });

      // Le son "silent: false" d'une Notification reste un bip système
      // discret, pas un vrai réveil qui sonne. Si un onglet de l'appli est
      // ouvert (au premier plan ou en arrière-plan), on lui demande de
      // jouer un vrai son d'alarme en boucle (voir components/ui/AlarmPlayer.tsx).
      // Si aucun onglet n'est ouvert, seule la notification système (avec
      // vibration) reste disponible : Apple/Android ne laissent pas un
      // service worker jouer du son en tâche de fond hors app ouverte.
      if (isAlarm) {
        const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const client of windowClients) {
          client.postMessage({ type: "PLAY_ALARM", title: data.title, body: data.body, url: data.url || "/" });
        }
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  const isStopAction = event.action === "stop-alarm";
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Le bouton "Arrêter" coupe le son dans tous les onglets ouverts,
        // sans forcément les mettre au premier plan.
        if (isStopAction) {
          for (const client of windowClients) {
            client.postMessage({ type: "STOP_ALARM" });
          }
          return;
        }
        for (const client of windowClients) {
          client.postMessage({ type: "STOP_ALARM" });
        }
        const url = event.notification.data?.url || "/";
        for (const client of windowClients) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
