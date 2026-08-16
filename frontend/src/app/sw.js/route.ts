import { NextResponse } from "next/server";

const swScript = `
const CACHE_VERSION = "onlyadults-v2-live";
const STATIC_CACHE = \`\${CACHE_VERSION}-static\`;

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

// Interception des requêtes : Stratégie Network-First
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth") || url.pathname.startsWith("/posts") || url.pathname.startsWith("/stories")) {
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
`;

export async function GET() {
  return new NextResponse(swScript, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
