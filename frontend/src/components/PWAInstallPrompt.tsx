"use client";

import React, { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Vérifier si l'app s'exécute déjà en mode autonome (PWA installée)
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isStandaloneMode);

    // 2. Détecter si l'utilisateur utilise un appareil iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDetected = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDetected);

    // 3. Ne rien afficher si déjà installé ou si l'utilisateur a fermé la bannière récemment (mémorisation de 3 jours)
    const dismissedTime = localStorage.getItem("pwa_prompt_dismissed");
    const isRecentlyDismissed =
      dismissedTime && Date.now() - Number(dismissedTime) < 3 * 24 * 60 * 60 * 1000;

    if (isStandaloneMode || isRecentlyDismissed) {
      return;
    }

    // 4. Intercepter l'événement beforeinstallprompt de Chrome/Android
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. Sur iOS/Safari, l'événement beforeinstallprompt n'est pas supporté.
    // On affiche donc manuellement la bannière d'instructions si on est sur iOS et pas en standalone.
    if (iosDetected && !isStandaloneMode) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("L'utilisateur a accepté d'installer la PWA.");
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa_prompt_dismissed", String(Date.now()));
    setShowPrompt(false);
  };

  if (!showPrompt || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40 animate-[slideUp_0.4s_ease-out_forwards] select-none">
      <div className="relative overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_90%,transparent)] backdrop-blur-md text-[var(--app-foreground)] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col gap-4">
        {/* Bouton de fermeture */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[var(--app-surface-soft)] text-neutral-400 hover:text-[var(--app-foreground)] transition"
          title="Fermer le guide"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-[18px] bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-black text-xl flex-shrink-0 shadow-sm">
            OA
          </div>
          <div className="pr-6 space-y-1">
            <h4 className="font-black text-sm tracking-tight">Installer OnlyAdults</h4>
            <p className="text-xs text-neutral-500 leading-normal">
              Profite d'une expérience fluide, rapide et sans limites directement depuis ton écran d'accueil.
            </p>
          </div>
        </div>

        {isIOS ? (
          /* Guide d'installation pour iOS / Safari */
          <div className="border-t border-[var(--app-border)] pt-3.5 space-y-2.5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">
              Instructions d'installation (iOS Safari)
            </div>
            <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--app-surface-soft)] text-xs font-bold flex items-center justify-center flex-shrink-0">
                  1
                </span>
                <span className="flex items-center flex-wrap gap-1">
                  Appuie sur le bouton de partage
                  <Share className="h-4 w-4 text-blue-500 mx-0.5 inline-block" />
                  dans la barre du navigateur.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--app-surface-soft)] text-xs font-bold flex items-center justify-center flex-shrink-0">
                  2
                </span>
                <span>
                  Fais défiler vers le bas et sélectionne{" "}
                  <strong className="text-[var(--app-foreground)] font-bold">
                    Sur l'écran d'accueil
                  </strong>
                  .
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Bouton d'installation pour Android / Chrome */
          <div className="border-t border-[var(--app-border)] pt-3 flex flex-col">
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[var(--app-foreground)] hover:opacity-90 text-[var(--app-background)] font-black py-3 text-sm tracking-tight transition shadow-sm"
            >
              <Download className="h-4 w-4" />
              <span>Installer l'application</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
