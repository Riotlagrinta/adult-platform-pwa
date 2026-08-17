const CACHE_VERSION = "onlyadults-v3-push";
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// Installation : Mise en cache des ressources de base
self.addEventListener("install", () => {
  self.skipWaiting();
});

// Activation : Nettoyage STRICT de TOUS les anciens caches sur tous les appareils
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE) {
            console.log("[SW] Suppression de l'ancien cache :", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Réception des Notifications Web Push (Même quand l'application ou le téléphone est fermé)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "OnlyAdults 🔔", body: event.data.text() };
  }

  const title = payload.title || "OnlyAdults";
  const options = {
    body: payload.body || "Vous avez reçu un nouveau message.",
    icon: payload.icon || "/icon-192x192.jpg",
    badge: payload.badge || "/icon-192x192.jpg",
    vibrate: [200, 100, 200],
    tag: payload.tag || "onlyadults-notification",
    data: {
      url: payload.url || "/",
      ...payload.data,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur une notification push : Ouvre ou met au premier plan la conversation/page ciblée
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          if ("navigate" in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Interception des requêtes : Stratégie Network-First
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth") || url.pathname.startsWith("/posts") || url.pathname.startsWith("/stories") || url.pathname.startsWith("/push")) {
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return caches.match("/");
        });
      })
  );
});
