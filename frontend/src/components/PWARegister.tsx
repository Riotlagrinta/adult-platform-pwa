"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Purge préventive des anciens caches au démarrage
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          if (name.includes("cache-v1") || name.includes("onlyadults-cache-v1")) {
            console.log("[PWA] Purge de l'ancien cache:", name);
            caches.delete(name);
          }
        });
      });
    }

    // Enregistrement et mise à jour forcée du Service Worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[PWA] Service Worker actif, scope:", reg.scope);
        // Force la vérification immédiate d'une nouvelle version sur le serveur
        reg.update();
      })
      .catch((err) => {
        console.error("[PWA] Erreur enregistrement SW:", err);
      });

    // Rechargement automatique et transparent dès qu'une nouvelle version prend le relais
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        console.log("[PWA] Nouvelle version détectée, rafraîchissement...");
        window.location.reload();
      }
    });
  }, []);

  return null;
}
