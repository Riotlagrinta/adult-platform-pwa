"use client";

import React from "react";
import { Download, ShieldCheck, RefreshCw, Zap, Bell, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Logo from "@/components/Logo";

export default function DownloadPage() {
  const apkDownloadUrl = "https://github.com/Riotlagrinta/adult-platform-pwa/releases/download/v1.0.0/OnlyAdults.apk";

  return (
    <div className="min-h-screen bg-[var(--app-background)] text-[var(--app-foreground)] p-4 md:p-8 flex flex-col justify-between select-none">
      {/* Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-4 border-b border-[var(--app-border)]">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-bold">Retour à l'accueil</span>
        </Link>
        <Logo size="sm" showText={true} />
      </header>

      {/* Main Content */}
      <main className="max-w-3xl w-full mx-auto my-8 space-y-8 animate-fadeIn">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--app-surface-soft)] border border-[var(--app-border)] text-xs font-black text-[var(--app-accent)]">
            <Zap className="w-3.5 h-3.5" />
            <span>APPLICATION OFFICIELLE ANDROID (APK)</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Installez OnlyAdults directement sur votre smartphone
          </h1>

          <p className="text-sm md:text-base text-neutral-400 max-w-xl mx-auto leading-relaxed">
            Profitez d'une expérience 100% plein écran, des notifications push directes et de <strong className="text-[var(--app-foreground)]">mises à jour automatiques en temps réel</strong> sans jamais devoir réinstaller l'application.
          </p>

          {/* Bouton Télécharger l'APK */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={apkDownloadUrl}
              className="w-full sm:w-auto px-8 py-4 rounded-3xl bg-[var(--app-foreground)] text-[var(--app-background)] font-black text-sm hover:opacity-90 transition shadow-lg flex items-center justify-center gap-3 group"
            >
              <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
              <span>Télécharger OnlyAdults.apk (Android)</span>
            </a>

            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-4 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-soft)] font-bold text-xs transition flex items-center justify-center gap-2"
            >
              <span>Continuer sur la version Web</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="text-[11px] text-neutral-500 flex items-center justify-center gap-2 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Version 1.0.0 · Certifiée sécurisée · 2.8 Mo</span>
          </div>
        </div>

        {/* 4 Avantages Clés */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] space-y-2 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="font-black text-sm">Mises à jour automatiques</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Dès qu'une nouveauté ou amélioration est déployée, l'application se met à jour instantanément à l'ouverture.
            </p>
          </div>

          <div className="p-5 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] space-y-2 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-black text-sm">Plein Écran Natif</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Aucune barre de navigation ni barre d'adresse de navigateur. Une immersion totale comme une vraie application du store.
            </p>
          </div>

          <div className="p-5 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] space-y-2 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="font-black text-sm">Alertes Push & Vibrations</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Recevez vos notifications de messages privés et d'abonnements directement sur l'écran verrouillé de votre smartphone.
            </p>
          </div>

          <div className="p-5 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] space-y-2 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-black text-sm">Indépendance & Discrétion</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Installation libre hors des restrictions de Google Play. Compatible avec vos thèmes et icônes personnalisés.
            </p>
          </div>
        </div>

        {/* Guide d'installation étape par étape */}
        <div className="p-6 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] space-y-4 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-wider text-[var(--app-foreground)]">
            Comment installer le fichier APK sur Android ?
          </h3>

          <div className="space-y-3 text-xs text-neutral-300">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] font-black text-xs flex items-center justify-center flex-shrink-0">
                1
              </span>
              <div>
                <strong className="text-[var(--app-foreground)]">Téléchargez le fichier</strong>
                <p className="text-neutral-400">Cliquez sur le bouton ci-dessus pour enregistrer <code>OnlyAdults.apk</code> sur votre téléphone.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] font-black text-xs flex items-center justify-center flex-shrink-0">
                2
              </span>
              <div>
                <strong className="text-[var(--app-foreground)]">Ouvrez le fichier téléchargé</strong>
                <p className="text-neutral-400">Appuyez sur la notification de téléchargement ou retrouvez-le dans l'application « Fichiers / Téléchargements ».</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] font-black text-xs flex items-center justify-center flex-shrink-0">
                3
              </span>
              <div>
                <strong className="text-[var(--app-foreground)]">Autorisez l'installation</strong>
                <p className="text-neutral-400">Si Android vous le demande, cochez « <em>Autoriser cette source</em> » puis appuyez sur « <em>Installer</em> ».</p>
              </div>
            </div>
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
