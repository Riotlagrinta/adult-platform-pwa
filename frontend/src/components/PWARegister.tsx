"use client";

import { useEffect } from "react";
import { initPwaIcon } from "@/lib/pwa-icon-client";

export default function PWARegister() {
  useEffect(() => {
    initPwaIcon();
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });

      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name);
          });
        });
      }

      return;
    }

    // Enregistrement et mise à jour forcée du Service Worker
    let intervalId: ReturnType<typeof setInterval> | null = null;

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        console.log("[PWA] Service Worker actif, scope:", reg.scope);
        // Force la vérification immédiate d'une nouvelle version sur le serveur
        reg.update();

        intervalId = setInterval(() => {
          reg.update();
        }, 60 * 60 * 1000);
      })
      .catch((err) => {
        console.error("[PWA] Erreur enregistrement SW:", err);
      });

    // Rechargement automatique et transparent dès qu'une nouvelle version prend le relais
    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        console.log("[PWA] Nouvelle version détectée, rafraîchissement...");
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
