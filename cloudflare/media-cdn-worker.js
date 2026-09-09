/**
 * Cloudflare Worker : Media CDN Streaming Proxy pour Backblaze B2
 * 
 * Avantages :
 * - Bandwidth Alliance : 0€ de frais de transfert entre Backblaze B2 et Cloudflare
 * - Mise en cache mondiale (Cloudflare Edge Cache) pour des chargements ultra-rapides
 * - Support complet des requêtes HTTP Range (avance rapide et reprise dans les vidéos)
 * - En-têtes CORS universels pour PWA, Web et APK Android Capacitor
 */

// Configuration de votre bucket Backblaze B2 d'origine
const B2_CONFIG = {
  // Votre endpoint Backblaze B2 d'origine (ex: s3.us-east-005.backblazeb2.com)
  originEndpoint: "https://s3.us-east-005.backblazeb2.com",
  // Nom par défaut de votre bucket
  bucketName: "Only-Adult",
  // Durée de mise en cache du navigateur (en secondes, ici 30 jours)
  browserCacheTTL: 60 * 60 * 24 * 30,
  // Durée de mise en cache sur le réseau Cloudflare Edge (en secondes, ici 30 jours)
  edgeCacheTTL: 60 * 60 * 24 * 30,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Répondre aux requêtes préliminaires CORS (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "Range, Authorization, Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Autoriser uniquement les requêtes de lecture (GET et HEAD)
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Méthode non autorisée", { status: 405 });
    }

    // 2. Construction de l'URL cible Backblaze B2
    const path = url.pathname.replace(/^\/+/, "");
    if (!path) {
      return new Response("OnlyAdults Cloudflare Media CDN actif 🚀", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Si le chemin ne contient pas déjà le nom du bucket, l'ajouter
    const targetPath = path.startsWith(B2_CONFIG.bucketName + "/")
      ? path
      : `${B2_CONFIG.bucketName}/${path}`;

    const b2Url = `${B2_CONFIG.originEndpoint}/${targetPath}${url.search}`;

    // 3. Vérification du cache Cloudflare Edge
    const cacheKey = new Request(b2Url, { method: "GET" });
    const cache = caches.default;
    const hasRange = request.headers.has("Range");

    // Si la requête ne demande pas un segment Range partiel, tenter le cache
    if (!hasRange) {
      let cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        const headers = new Headers(cachedResponse.headers);
        headers.set("X-Cache-Status", "HIT (Cloudflare Edge)");
        headers.set("Access-Control-Allow-Origin", "*");
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          headers,
        });
      }
    }

    // 4. Transmission de la requête vers Backblaze B2
    const forwardHeaders = new Headers();
    if (hasRange) {
      forwardHeaders.set("Range", request.headers.get("Range"));
    }
    forwardHeaders.set("User-Agent", "OnlyAdults-Cloudflare-CDN");

    try {
      const b2Response = await fetch(b2Url, {
        method: request.method,
        headers: forwardHeaders,
      });

      if (!b2Response.ok && b2Response.status !== 206) {
        return new Response(`Fichier non trouvé sur le stockage (${b2Response.status})`, {
          status: b2Response.status,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }

      // 5. Préparation des en-têtes de réponse optimisés
      const responseHeaders = new Headers(b2Response.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      responseHeaders.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
      responseHeaders.set("Accept-Ranges", "bytes");
      responseHeaders.set("X-Cache-Status", "MISS (Origine Backblaze B2)");
      responseHeaders.set("X-Powered-By", "OnlyAdults Cloudflare CDN");

      // Mise en cache navigateur et CDN
      if (b2Response.status === 200) {
        responseHeaders.set(
          "Cache-Control",
          `public, max-age=${B2_CONFIG.browserCacheTTL}, s-maxage=${B2_CONFIG.edgeCacheTTL}, immutable`
        );
      }

      const clientResponse = new Response(b2Response.body, {
        status: b2Response.status,
        headers: responseHeaders,
      });

      // Enregistrer dans le cache Cloudflare en tâche de fond pour les réponses complètes (200)
      if (b2Response.status === 200 && !hasRange) {
        ctx.waitUntil(cache.put(cacheKey, clientResponse.clone()));
      }

      return clientResponse;
    } catch (err) {
      return new Response("Erreur de connexion au stockage Backblaze B2", {
        status: 502,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};
