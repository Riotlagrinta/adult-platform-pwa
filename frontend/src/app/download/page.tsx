"use client";

import React, { useEffect, useState } from "react";
import {
  Download,
  ShieldCheck,
  RefreshCw,
  Zap,
  Bell,
  CheckCircle2,
  ArrowLeft,
  Smartphone,
  FileDown,
  Apple,
  Share,
  PlusSquare,
  Sparkles,
  Layers,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { haptics } from "@/lib/haptics";

export default function DownloadPage() {
  const [activeTab, setActiveTab] = useState<"android" | "ios">("android");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Auto-detect OS
    if (typeof window !== "undefined") {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(userAgent)) {
        setActiveTab("ios");
      } else {
        setActiveTab("android");
      }

      if (window.matchMedia("(display-mode: standalone)").matches) {
        setIsInstalled(true);
      }
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleNativeInstall = async () => {
    haptics.medium();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        haptics.success();
      }
      setDeferredPrompt(null);
    } else {
      alert(
        "📱 Installation PWA directe :\n\n" +
          "1. Appuyez sur les 3 petits points (⋮) en haut à droite de Chrome.\n" +
          "2. Cliquez sur 'Ajouter à l'écran d'accueil' ou 'Installer l'application'."
      );
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-background)] text-[var(--app-foreground)] p-4 md:p-8 flex flex-col justify-between select-none">
      {/* Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-4 border-b border-[var(--app-border)]">
        <Link
          href="/"
          onClick={() => haptics.light()}
          className="flex items-center gap-2 hover:opacity-80 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-bold">Retour à l'accueil</span>
        </Link>
        <Logo size="sm" showText={true} />
      </header>

      {/* Main Content */}
      <main className="max-w-3xl w-full mx-auto my-8 space-y-8 animate-fadeIn">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--app-surface-soft)] border border-[var(--app-border)] text-xs font-black text-[var(--app-accent)] shadow-sm">
            <Zap className="w-3.5 h-3.5" />
            <span>APPLICATION MOBILE OFFICIELLE</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Installez OnlyAdults sur votre téléphone
          </h1>

          <p className="text-sm md:text-base text-neutral-400 max-w-xl mx-auto leading-relaxed">
            Profitez d'une expérience ultra-rapide en plein écran, avec notifications privées instantanées, messages vocaux et sécurité maximale.
          </p>

          {/* Sélecteur d'OS (Tabs iOS / Android) */}
          <div className="inline-flex p-1.5 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] shadow-inner gap-1">
            <button
              onClick={() => {
                haptics.selection();
                setActiveTab("android");
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition ${
                activeTab === "android"
                  ? "bg-[var(--app-foreground)] text-[var(--app-background)] shadow-md"
                  : "text-neutral-400 hover:text-[var(--app-foreground)]"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Android (APK & PWA)</span>
            </button>

            <button
              onClick={() => {
                haptics.selection();
                setActiveTab("ios");
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition ${
                activeTab === "ios"
                  ? "bg-[var(--app-foreground)] text-[var(--app-background)] shadow-md"
                  : "text-neutral-400 hover:text-[var(--app-foreground)]"
              }`}
            >
              <Apple className="w-4 h-4" />
              <span>iPhone & iPad (iOS)</span>
            </button>
          </div>
        </div>

        {/* CONTENU ONGLET ANDROID */}
        {activeTab === "android" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Boutons Actions Android */}
            <div className="p-6 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-lg flex flex-col items-center text-center space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-black tracking-tight">
                  Package Android Officiel (.apk)
                </h2>
                <p className="text-xs text-neutral-400">
                  Installation directe sans passer par le Play Store. Zéro censure, 100% privé.
                </p>
              </div>

              <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <a
                  href="/OnlyAdults.apk"
                  download="OnlyAdults.apk"
                  onClick={() => haptics.medium()}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[var(--app-foreground)] text-[var(--app-background)] font-black text-sm hover:opacity-90 transition shadow-md flex items-center justify-center gap-3 group"
                >
                  <FileDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                  <span>Télécharger l'APK Android (Debug/Release)</span>
                </a>

                <button
                  onClick={handleNativeInstall}
                  className="w-full sm:w-auto px-6 py-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] hover:bg-neutral-800 font-bold text-xs transition flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-4 h-4 text-[var(--app-accent)]" />
                  <span>Installer en PWA (Sans fichier)</span>
                </button>
              </div>

              <div className="text-[11px] text-neutral-500 flex items-center justify-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Signé & Certifié · Compatible Android 8.0 à 15+</span>
              </div>
            </div>

            {/* Guide Android 3 étapes */}
            <div className="p-6 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-raised,#18181b)] space-y-4 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--app-foreground)] flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[var(--app-accent)]" />
                Comment installer le fichier APK sur Android :
              </h3>

              <div className="space-y-3 text-xs text-neutral-300">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] font-black text-xs flex items-center justify-center flex-shrink-0">
                    1
                  </span>
                  <div>
                    <strong className="text-[var(--app-foreground)]">Téléchargez le fichier APK</strong>
                    <p className="text-neutral-400">Appuyez sur le bouton ci-dessus pour lancer le téléchargement.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] font-black text-xs flex items-center justify-center flex-shrink-0">
                    2
                  </span>
                  <div>
                    <strong className="text-[var(--app-foreground)]">Ouvrez le fichier téléchargé</strong>
                    <p className="text-neutral-400">Appuyez sur la notification de fin de téléchargement ou dans l'application "Fichiers / Téléchargements".</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] font-black text-xs flex items-center justify-center flex-shrink-0">
                    3
                  </span>
                  <div>
                    <strong className="text-[var(--app-foreground)]">Autorisez et confirmez</strong>
                    <p className="text-neutral-400">Si Android vous le demande, cochez "Autoriser l'installation depuis cette source" puis appuyez sur "Installer".</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTENU ONGLET IPHONE / IOS */}
        {activeTab === "ios" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Guide iOS PWA */}
            <div className="p-6 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-lg space-y-6">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-black">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>EXPÉRIENCE SUPER-NATIVE RECOMMANDÉE (iOS 16.4+)</span>
                </div>
                <h2 className="text-lg font-black tracking-tight pt-1">
                  Installation instantanée sur l'écran d'accueil iPhone
                </h2>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  En ajoutant l'application sur votre écran d'accueil Safari, vous bénéficiez du plein écran sans barre d'adresse, des notifications push et des retours haptiques.
                </p>
              </div>

              {/* Étapes illustrées iOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-5 rounded-2xl bg-[var(--app-surface-soft)] border border-[var(--app-border)] space-y-3 flex flex-col justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-blue-500 text-white font-black text-xs flex items-center justify-center shadow-md">
                      1
                    </span>
                    <h4 className="font-black text-sm">Bouton Partager Safari</h4>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Dans Safari sur votre iPhone, appuyez sur le bouton de partage situé en bas de l'écran :
                  </p>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center gap-2 text-blue-400 font-bold text-xs">
                    <Share className="w-5 h-5" />
                    <span>Icône Partager (Carré avec flèche vers le haut)</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--app-surface-soft)] border border-[var(--app-border)] space-y-3 flex flex-col justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-emerald-500 text-white font-black text-xs flex items-center justify-center shadow-md">
                      2
                    </span>
                    <h4 className="font-black text-sm">Sur l'écran d'accueil</h4>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Faites défiler le menu vers le bas et sélectionnez :
                  </p>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs">
                    <PlusSquare className="w-5 h-5" />
                    <span>« Sur l'écran d'accueil »</span>
                  </div>
                </div>
              </div>

              {/* Note IPA Sideloadly */}
              <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-neutral-300 space-y-3">
                <div className="flex items-center gap-2 text-purple-400 font-bold">
                  <Layers className="w-4 h-4" />
                  <span>Option Développeur / Projet iOS Natif (Xcode / Sideloadly / AltStore) :</span>
                </div>
                <p className="text-neutral-400 leading-relaxed text-[11px]">
                  Pour installer l'application native sous forme de paquet <code>.ipa</code> sans passer par l'App Store, vous pouvez télécharger le package projet iOS officiel et l'injecter sur votre iPhone via <strong>Sideloadly</strong> ou <strong>AltStore</strong>.
                </p>
                <div className="pt-1">
                  <a
                    href="/downloads/OnlyAdults-iOS.zip"
                    download="OnlyAdults-iOS.zip"
                    onClick={() => haptics.medium()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-sm"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Télécharger le Package iOS (.zip · 3.8 Mo)</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4 Avantages Clés */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] space-y-2 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="font-black text-sm">Mises à jour instantanées</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Dès qu'une nouveauté est déployée, l'application se met à jour automatiquement sans re-téléchargement fastidieux.
            </p>
          </div>

          <div className="p-5 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] space-y-2 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-black text-sm">Plein Écran & Safe Areas</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Immersion totale épousant l'encoche et la Dynamic Island de votre iPhone, sans barre d'adresse.
            </p>
          </div>

          <div className="p-5 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] space-y-2 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="font-black text-sm">Alertes Push & Messages Vocaux</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Recevez vos alertes de messages privés en arrière-plan et écoutez vos notes vocales avec formes d'ondes fluides.
            </p>
          </div>

          <div className="p-5 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] space-y-2 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-black text-sm">100% Privé & Discret</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Installation autonome hors des magasins d'applications avec sélecteur d'icône de camouflage discret.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center py-4 text-[10px] text-neutral-500 border-t border-[var(--app-border)]">
        © 2026 ONLYADULTS. APPLICATION STRICTEMENT RÉSERVÉE AUX ADULTES (18+).
      </footer>
    </div>
  );
}
