"use client";

import React from "react";
import { WifiOff, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-background)] text-[var(--app-foreground)] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full bg-[var(--app-surface)] border border-[var(--app-border)] rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center animate-pulse">
          <WifiOff className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">Hors-ligne</h1>
          <p className="text-sm text-neutral-400">
            Vous n'êtes actuellement pas connecté à Internet. Vérifiez votre connexion Wi-Fi ou vos données mobiles.
          </p>
        </div>

        <div className="flex flex-col w-full gap-3 pt-2">
          <button
            onClick={handleReload}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-[var(--app-foreground)] text-[var(--app-background)] font-black text-sm tracking-tight hover:opacity-90 active:scale-[0.98] transition shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Réessayer</span>
          </button>

          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-[var(--app-surface-soft)] text-neutral-300 font-bold text-sm tracking-tight hover:bg-neutral-800 active:scale-[0.98] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'accueil</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
