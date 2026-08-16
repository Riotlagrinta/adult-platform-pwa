const CACHE_VERSION = "onlyadults-v2-live";
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// Installation : Mise en cache des ressources de base
self.addEventListener("install", () => {
  self.skipWaiting(); // Force le nouveau SW à devenir actif immédiatement
});

// Activation : Nettoyage STRICT de TOUS les anciens caches sur tous les appareils
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Supprime systématiquement tout ancien cache
          if (key !== STATIC_CACHE) {
            console.log("[SW] Suppression de l'ancien cache :", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // Prend le contrôle immédiat de tous les onglets ouverts
  );
});

// Interception des requêtes : Stratégie Network-First pour TOUJOURS avoir la dernière version
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Ne jamais mettre en cache les requêtes API, WebSocket ou tiers
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth") || url.pathname.startsWith("/posts") || url.pathname.startsWith("/stories")) {
    return;
  }

  // Pour toutes les requêtes de navigation et pages : NETWORK-FIRST
  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then((networkResponse) => {
        // Si le réseau répond avec succès, on met à jour le cache en arrière-plan
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // En cas de coupure internet uniquement (hors-ligne), on se rabat sur le cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return caches.match("/");
        });
      })
  );
});
