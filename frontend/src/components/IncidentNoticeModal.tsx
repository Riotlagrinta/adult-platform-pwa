"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ShieldAlert, ShieldCheck, Heart, ArrowRight, X, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "onlyadults_incident_notice_dismissed_v24h";
// Date de début de l'annonce : 22 Août 2026
const NOTICE_START_TIME = new Date("2026-08-22T10:00:00Z").getTime();
const DURATION_24H_MS = 24 * 60 * 60 * 1000;

export default function IncidentNoticeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"thanks" | "details">("thanks");
  const router = useRouter();

  useEffect(() => {
    try {
      const now = Date.now();
      // Vérifier si la fenêtre de 24h est encore active
      const isWithin24h = now - NOTICE_START_TIME <= DURATION_24H_MS;
      
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (isWithin24h && !dismissed) {
        // Petit délai d'animation pour une apparition ultra-fluide
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 300);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignorer si localStorage n'est pas disponible
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {}
    setIsOpen(false);
  };

  const handleRecreateAccount = () => {
    handleDismiss();
    router.push("/");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Container principal avec halo lumineux */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-amber-500/30 bg-neutral-950/95 p-6 sm:p-8 text-neutral-100 shadow-[0_0_60px_rgba(245,158,11,0.18)] transition-all duration-300">
        {/* Cercles de flou décoratifs en arrière-plan */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-rose-500/15 blur-3xl" />

        {/* Bouton de fermeture discret en haut à droite */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 rounded-full p-2 text-neutral-400 hover:bg-neutral-800/80 hover:text-white transition cursor-pointer"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        {step === "thanks" ? (
          /* ── ÉTAPE 1 : REMERCIEMENTS & ANNONCE ── */
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-rose-500/20 border border-amber-400/30 text-amber-400 shadow-inner">
                <Heart className="h-6 w-6 fill-amber-400/20 text-amber-400 animate-pulse" />
              </div>
              <div>
                <span className="inline-block rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-amber-400 uppercase border border-amber-500/20">
                  Message Officiel OnlyAdults
                </span>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                  Merci pour votre confiance ✨
                </h2>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-neutral-300">
              Chers membres, nous tenons à vous adresser nos plus sincères <strong className="text-white">remerciements</strong> pour votre fidélité, vos échanges et votre présence quotidienne sur OnlyAdults.
            </p>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wide">
                <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
                Information Technique Importante
              </div>
              <p className="text-xs leading-relaxed text-neutral-300">
                Afin de garantir une sécurité maximale et un fonctionnement irréprochable, une réinitialisation de notre base de données a été effectuée.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep("details")}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-rose-500 py-3.5 px-5 font-black text-sm text-black shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
              >
                <span>Lire la suite</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={handleDismiss}
                className="w-full sm:w-auto rounded-2xl border border-neutral-800 bg-neutral-900/60 py-3.5 px-4 font-bold text-xs text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition cursor-pointer"
              >
                Passer
              </button>
            </div>
          </div>
        ) : (
          /* ── ÉTAPE 2 : DÉTAILS DE L'INCIDENT & INVITATION À RECRÉER LE COMPTE ── */
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <RefreshCw className="h-6 w-6 text-rose-400" />
              </div>
              <div>
                <span className="inline-block rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-rose-400 uppercase border border-rose-500/20">
                  Réinitialisation Sécurisée
                </span>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                  Nouveau Départ & Sécurité
                </h2>
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              <p>
                Suite à des anomalies détectées sur notre précédent serveur de base de données, <strong className="text-rose-300">l'ensemble des comptes et données a été réinitialisé</strong> pour repartir sur une base 100% saine et inviolable.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="flex items-center gap-2 rounded-xl bg-neutral-900 border border-neutral-800 p-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-semibold text-neutral-200">Serveurs ultra-sécurisés</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-neutral-900 border border-neutral-800 p-2.5">
                  <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-semibold text-neutral-200">Performances décuplées</span>
                </div>
              </div>

              <p className="pt-2 text-xs text-amber-200/90 font-medium">
                👉 Nous vous invitons chaleureusement à <strong className="text-white">recréer votre compte en 30 secondes</strong> afin de retrouver tous vos accès privilégiés.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                onClick={handleRecreateAccount}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-rose-500 py-3.5 px-5 font-black text-sm text-black shadow-lg shadow-amber-500/25 hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-black" />
                <span>✨ Recréer mon compte maintenant</span>
              </button>
              
              <button
                onClick={handleDismiss}
                className="w-full rounded-2xl border border-neutral-800 py-2.5 px-4 font-bold text-xs text-neutral-400 hover:text-white hover:bg-neutral-900 transition cursor-pointer"
              >
                J'ai compris, accéder au site
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
