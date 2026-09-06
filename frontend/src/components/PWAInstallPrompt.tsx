"use client";

import React, { useEffect, useState } from "react";
import { X, Download, Share, CheckCircle2 } from "lucide-react";
import { getPwaIconById } from "@/lib/pwa-icons";
import { getSavedPwaIconId } from "@/lib/pwa-icon-client";
import { checkIsStandalone, markAsInstalled } from "@/lib/use-standalone";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Vérifier si l'app s'exécute déjà en mode autonome ou a été marquée comme installée
    const standalone = checkIsStandalone();
    setIsStandalone(standalone);

    const urlParams = new URLSearchParams(window.location.search);
    const forcePwa = urlParams.get("force-pwa") === "true";

    // 2. Détecter iOS (iPhone/iPad/iPod)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDetected = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDetected);

    // Si forcé en mode debug/développement
    if (forcePwa) {
      setShowPrompt(true);
      return;
    }

    // 3. Vérifier le stockage persistant (localStorage)
    const isDismissed =
      localStorage.getItem("pwa_prompt_dismissed") === "true" ||
      localStorage.getItem("pwa_installed") === "true" ||
      sessionStorage.getItem("pwa_prompt_dismissed") === "true";

    if (standalone || isDismissed) {
      return;
    }

    // 4. Intercepter l'événement beforeinstallprompt (Chrome / Android / Edge)
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowPrompt(true);
    };

    // 5. Intercepter l'installation complétée
    const handleAppInstalled = () => {
      markAsInstalled();
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // 6. Sur iOS/Safari (qui ne supporte pas beforeinstallprompt)
    if (iosDetected && !standalone && !isDismissed) {
      // Petit délai pour ne pas agresser au chargement initial
      const timer = setTimeout(() => {
        if (!checkIsStandalone() && localStorage.getItem("pwa_prompt_dismissed") !== "true") {
          setShowPrompt(true);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        markAsInstalled();
      }
    } catch {}
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem("pwa_prompt_dismissed", "true");
      sessionStorage.setItem("pwa_prompt_dismissed", "true");
    } catch {}
    setShowPrompt(false);
  };

  const handleAlreadyInstalled = () => {
    markAsInstalled();
    setShowPrompt(false);
  };

  const isForcePwa =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("force-pwa") === "true";

  const shouldHide = !showPrompt || (isStandalone && !isForcePwa);

  if (shouldHide) {
    return null;
  }

  const iconConfig = getPwaIconById(getSavedPwaIconId());

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[400px] z-50 animate-[slideUp_0.4s_ease-out_forwards] select-none">
      <div className="relative overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_92%,transparent)] backdrop-blur-xl text-[var(--app-foreground)] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.25)] flex flex-col gap-4">
        {/* Bouton de fermeture */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[var(--app-surface-soft)] text-neutral-400 hover:text-[var(--app-foreground)] transition"
          title="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <div className="w-12 h-12 rounded-[18px] overflow-hidden flex-shrink-0 shadow-md border border-black/10 dark:border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/pwa-icon?id=${iconConfig.id}`}
              alt="Icône d'application"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-1 min-w-0">
            <h4 className="font-black text-sm tracking-tight truncate">
              Installer {iconConfig.appName}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-normal">
              Accès instantané depuis l'écran d'accueil, sans barre d'adresse ni interruption.
            </p>
          </div>
        </div>

        {isIOS ? (
          /* Guide d'installation pour iOS / Safari */
          <div className="border-t border-[var(--app-border)] pt-3.5 space-y-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold">
              Instructions d'installation (iOS Safari)
            </div>
            <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--app-surface-soft)] text-xs font-bold flex items-center justify-center flex-shrink-0">
                  1
                </span>
                <span className="flex items-center flex-wrap gap-1">
                  Appuie sur l'icône Partager
                  <Share className="h-4 w-4 text-blue-500 mx-0.5 inline-block" />
                  dans Safari.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--app-surface-soft)] text-xs font-bold flex items-center justify-center flex-shrink-0">
                  2
                </span>
                <span>
                  Sélectionne{" "}
                  <strong className="text-[var(--app-foreground)] font-bold">
                    « Sur l'écran d'accueil »
                  </strong>
                  .
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleAlreadyInstalled}
                className="text-[11px] font-bold text-[var(--app-accent,#25D366)] hover:underline flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>C'est déjà fait !</span>
              </button>
              <button
                onClick={handleDismiss}
                className="text-[11px] text-neutral-400 hover:text-[var(--app-foreground)] transition"
              >
                Ne plus afficher
              </button>
            </div>
          </div>
        ) : (
          /* Bouton d'installation pour Android / Chrome / Windows */
          <div className="border-t border-[var(--app-border)] pt-3 flex flex-col gap-2.5">
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[var(--app-foreground)] hover:opacity-90 text-[var(--app-background)] font-black py-3 text-sm tracking-tight transition shadow-sm active:scale-[0.98]"
              >
                <Download className="h-4 w-4" />
                <span>Ajouter à l'écran d'accueil</span>
              </button>
            )}
            
            <div className="flex items-center justify-between px-1">
              <button
                onClick={handleAlreadyInstalled}
                className="text-[11px] font-bold text-[var(--app-accent,#25D366)] hover:underline flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Déjà installé</span>
              </button>
              <button
                onClick={handleDismiss}
                className="text-[11px] text-neutral-400 hover:text-[var(--app-foreground)] transition"
              >
                Plus tard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
