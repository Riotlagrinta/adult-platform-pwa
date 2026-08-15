"use client";

import { useEffect } from "react";

type WindowWithWorkbox = Window & {
  workbox?: unknown;
};

export default function PWARegister() {
  useEffect(() => {
    const win = window as WindowWithWorkbox;
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      win.workbox === undefined
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service Worker enregistré avec succès, scope:", reg.scope);
        })
        .catch((err) => {
          console.error("Échec de l'enregistrement du Service Worker:", err);
        });
    }
  }, []);

  return null;
}
