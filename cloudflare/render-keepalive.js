/**
 * Cloudflare Worker : Keep-Alive 24/7 pour Render
 * 
 * Rôle :
 * Effectue un ping régulier sur le backend Render (/health)
 * afin d'empêcher la mise en veille au bout de 15 minutes d'inactivité.
 * 
 * Déclencheur Cron recommandé dans Cloudflare :
 * cron = "*/10 * * * *" (toutes les 10 minutes)
 */

// URL de votre API Render
const RENDER_HEALTH_URL = "https://onlyadults-backend.onrender.com/health";

export default {
  // 1. Exécution automatique par le Cron Trigger de Cloudflare
  async scheduled(event, env, ctx) {
    ctx.waitUntil(pingBackend());
  },

  // 2. Exécution manuelle par requête HTTP (pour tester dans votre navigateur)
  async fetch(request, env, ctx) {
    const result = await pingBackend();
    return new Response(JSON.stringify(result, null, 2), {
      status: result.ok ? 200 : 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
};

async function pingBackend() {
  const startTime = Date.now();
  try {
    const res = await fetch(RENDER_HEALTH_URL, {
      method: "GET",
      headers: {
        "User-Agent": "OnlyAdults-Cloudflare-KeepAlive-Bot/1.0",
      },
    });

    const elapsedMs = Date.now() - startTime;
    const isOk = res.ok;
    let data = null;

    // res.json() consomme le corps de la réponse : s'il échoue (réponse non-JSON, ex. page
    // d'erreur HTML pendant un cold start), on ne peut plus relire le même Response avec
    // res.text() ("body already used"). On clone donc avant de tenter le parsing JSON.
    try {
      data = await res.clone().json();
    } catch {
      try {
        data = await res.text();
      } catch {
        data = null;
      }
    }

    console.log(`[KeepAlive] Ping Render (${res.status}) en ${elapsedMs}ms`);

    return {
      ok: isOk,
      status: res.status,
      elapsedMs,
      timestamp: new Date().toISOString(),
      targetUrl: RENDER_HEALTH_URL,
      response: data,
    };
  } catch (err) {
    const elapsedMs = Date.now() - startTime;
    console.error("[KeepAlive] Échec ping Render :", err);
    return {
      ok: false,
      error: err.message || "Erreur réseau inconnue",
      elapsedMs,
      timestamp: new Date().toISOString(),
      targetUrl: RENDER_HEALTH_URL,
    };
  }
}
