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
        data: { url: data.url || "/", type: data.type, blockId: data.blockId },
        // Un réveil (type "alarm") doit rester affiché tant qu'il n'est pas
        // explicitement fermé/traité — sans ça, la notif peut disparaître
        // toute seule après quelques secondes sur certains appareils et
        // passer complètement inaperçue pendant le sommeil.
        requireInteraction: isAlarm,
        // Vibration sur TOUTES les notifs, pas seulement les reveils : le son
        // systeme depend du canal de notification du site cote Android (reglable
        // uniquement dans les parametres du telephone, hors de portee du code).
        // Sans vibration, une notif arrivant sur un canal silencieux ne laisse
        // aucun signal perceptible, d'ou le retour "les notifs font 0 son".
        vibrate: isAlarm ? [400, 200, 400, 200, 400, 200, 400] : [200, 100, 200],
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
          client.postMessage({ type: "PLAY_ALARM", title: data.title, body: data.body, url: data.url || "/", blockId: data.blockId });
        }
      } else {
        // Retour direct : "faut que les notifs fassent reellement du son de
        // notif" — le silent:false d'une Notification systeme ne suffit pas
        // toujours (reglages Android/iOS, volume notif coupe). Si un onglet
        // de l'appli est ouvert, on lui demande de jouer un court son audible
        // en plus, voir components/ui/AlarmPlayer.tsx (listener PLAY_CHIME).
        const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const client of windowClients) {
          client.postMessage({ type: "PLAY_CHIME" });
        }
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  const isStopAction = event.action === "stop-alarm";
  const isAlarmNotif = event.notification.data?.type === "alarm";
  const blockId = event.notification.data?.blockId;
  event.notification.close();
  event.waitUntil(
    (async () => {
      // Toute interaction avec une notif réveil (bouton "Arrêter" ou clic sur
      // la notif elle-même) vaut acquittement : arrête l'escalade côté cron
      // (voir app/api/cron/schedule-block-notify) sans quoi la notif
      // reviendrait toutes les 5 min même après que l'utilisateur l'a vue.
      if (isAlarmNotif && blockId) {
        fetch("/api/client/schedule-blocks/ack-alarm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blockId }),
          credentials: "include",
        }).catch(() => {});
      }

      const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
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
    })()
  );
});
