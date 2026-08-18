"use client";

import React, { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";
import { getPwaIconById } from "@/lib/pwa-icons";
import { getSavedPwaIconId, initPwaIcon } from "@/lib/pwa-icon-client";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const forcePwa = urlParams.get("force-pwa") === "true";

    // 1. Vérifier si l'app s'exécute déjà en mode autonome (PWA installée)
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isStandaloneMode);

    // 2. Détecter si l'utilisateur utilise un appareil iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDetected = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDetected);

    // Si on force l'affichage en développement, on ignore le standalone et les rejets
    if (forcePwa) {
      setShowPrompt(true);
      return;
    }

    // 3. Ne rien afficher si déjà installé ou si l'utilisateur a fermé la bannière pour la session en cours
    const isDismissed = sessionStorage.getItem("pwa_prompt_dismissed") === "true";

    if (isStandaloneMode || isDismissed) {
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
    sessionStorage.setItem("pwa_prompt_dismissed", "true");
    setShowPrompt(false);
  };

  // En mode forcé, on ignore isStandalone pour pouvoir afficher la bannière sur PC
  const shouldHide = !showPrompt || (isStandalone && typeof window !== "undefined" && !(new URLSearchParams(window.location.search).get("force-pwa") === "true"));

  if (shouldHide) {
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
          <div className="w-12 h-12 rounded-[18px] overflow-hidden flex-shrink-0 shadow-md border border-black/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/pwa-icon?id=${getSavedPwaIconId()}`}
              alt="Icône d'installation"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="pr-6 space-y-1">
            <div className="flex items-center gap-1.5">
              <h4 className="font-black text-sm tracking-tight">Installer {getPwaIconById(getSavedPwaIconId()).appName}</h4>
            </div>
            <p className="text-xs text-neutral-500 leading-normal">
              Icône : <strong className="text-[var(--app-foreground)]">{getPwaIconById(getSavedPwaIconId()).name}</strong>. Personnalisable dans Paramètres.
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
          <div className="border-t border-[var(--app-border)] pt-3 flex flex-col gap-2">
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[var(--app-foreground)] hover:opacity-90 text-[var(--app-background)] font-black py-3 text-sm tracking-tight transition shadow-sm"
            >
              <Download className="h-4 w-4" />
              <span>Installer sur l'écran d'accueil</span>
            </button>
            <a
              href="/download"
              className="text-center text-[11px] font-bold text-neutral-400 hover:text-[var(--app-foreground)] py-1 transition underline"
            >
              Ou télécharger le fichier .APK direct (Android)
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
