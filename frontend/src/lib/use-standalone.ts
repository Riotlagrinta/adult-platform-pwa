"use client";

import { useEffect, useState } from "react";

export function checkIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://") ||
      window.location.search.includes("standalone=true") ||
      window.location.search.includes("mode=pwa") ||
      window.location.search.includes("source=pwa") ||
      localStorage.getItem("pwa_installed") === "true" ||
      Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
      Boolean((window as any).Capacitor?.platform === "android") ||
      Boolean((window as any).Capacitor?.platform === "ios")
    );
  } catch {
    return false;
  }
}

export function markAsInstalled(): void {
  try {
    localStorage.setItem("pwa_installed", "true");
    localStorage.setItem("pwa_prompt_dismissed", "true");
  } catch {}
}

export function useIsStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(checkIsStandalone());

    const mqStandalone = window.matchMedia("(display-mode: standalone)");
    const mqFullscreen = window.matchMedia("(display-mode: fullscreen)");
    const mqMinimal = window.matchMedia("(display-mode: minimal-ui)");

    const handler = () => {
      setIsStandalone(checkIsStandalone());
    };

    mqStandalone.addEventListener?.("change", handler);
    mqFullscreen.addEventListener?.("change", handler);
    mqMinimal.addEventListener?.("change", handler);

    window.addEventListener("appinstalled", () => {
      markAsInstalled();
      setIsStandalone(true);
    });

    return () => {
      mqStandalone.removeEventListener?.("change", handler);
      mqFullscreen.removeEventListener?.("change", handler);
      mqMinimal.removeEventListener?.("change", handler);
    };
  }, []);

  return isStandalone;
}

