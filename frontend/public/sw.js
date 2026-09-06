const CACHE_VERSION = "onlyadults-v4-speed";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Ressources critiques à pré-mettre en cache dès l'installation
const PRECACHE_ASSETS = [
  "/",
  "/manifest.json",
];

// Installation : Mise en cache rapide et activation immédiate
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[SW] Erreur pré-cache non bloquante:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activation : Nettoyage STRICT des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== RUNTIME_CACHE) {
            console.log("[SW] Suppression de l'ancien cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Réception des Notifications Web Push (iOS 16.4+ et Android)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "OnlyAdults 🔔", body: event.data.text() };
  }

  const title = payload.title || "OnlyAdults";
  const conversationId = payload.data?.conversationId || (payload.tag && payload.tag.startsWith("msg-") ? payload.tag.replace("msg-", "") : undefined);

  const options = {
    body: payload.body || "Nouveau message privé reçu.",
    icon: payload.icon || "/api/pwa-icon?v=2026",
    badge: payload.badge || "/api/pwa-icon?v=2026",
    vibrate: [150, 80, 150],
    tag: payload.tag || (conversationId ? `msg-${conversationId}` : `notif-${Date.now()}`),
    renotify: true,
    data: {
      url: payload.url || (conversationId ? "/messages" : "/notifications"),
      conversationId,
      ...payload.data,
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // Mettre à jour le badge d'application sur l'icône de l'écran d'accueil si supporté
      if ("setAppBadge" in navigator) {
        navigator.setAppBadge().catch(() => {});
      }
    })
  );
});

// Clic sur une notification push : Ouvre ou focus l'application
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  // Réinitialiser le badge
  if ("clearAppBadge" in navigator) {
    navigator.clearAppBadge().catch(() => {});
  }

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

// Stratégie de mise en cache ultra-performante
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // 1. Ne jamais intercepter les APIs dynamiques ou websockets
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/messages") ||
    url.pathname.startsWith("/social") ||
    url.pathname.startsWith("/notifications") ||
    url.pathname.startsWith("/files") ||
    url.pathname.startsWith("/push") ||
    url.pathname.startsWith("/socket.io") ||
    url.hostname !== self.location.hostname
  ) {
    return;
  }

  // 2. Cache-First pour les assets statiques Next.js et médias (/_next/static/, images, fonts)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff2|woff|ttf|ico|css|js)$/i)
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Stale-While-Revalidate pour les pages de navigation
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
            const responseToCache = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return cachedResponse || caches.match("/");
        });

      return cachedResponse || fetchPromise;
    })
  );
});
