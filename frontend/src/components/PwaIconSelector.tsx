"use client";

import React, { useEffect, useState } from "react";
import { Check, Smartphone, Shield, Sparkles, CheckCircle2 } from "lucide-react";
import { PWA_ICON_OPTIONS, getPwaIconById, type PwaIconOption } from "@/lib/pwa-icons";
import { getSavedPwaIconId, setPwaIcon, initPwaIcon } from "@/lib/pwa-icon-client";

export default function PwaIconSelector() {
  const [selectedIconId, setSelectedIconId] = useState<string>("prestige");
  const [activeCategory, setActiveCategory] = useState<"all" | "official" | "disguise">("all");
  const [justApplied, setJustApplied] = useState(false);

  useEffect(() => {
    initPwaIcon();
    setSelectedIconId(getSavedPwaIconId());

    const handleIconChange = (e: any) => {
      if (e.detail?.iconId) {
        setSelectedIconId(e.detail.iconId);
      }
    };

    window.addEventListener("pwaiconchange", handleIconChange);
    return () => window.removeEventListener("pwaiconchange", handleIconChange);
  }, []);

  const handleSelectIcon = (iconId: string) => {
    setSelectedIconId(iconId);
    setPwaIcon(iconId);
    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 2500);
  };

  const currentIcon = getPwaIconById(selectedIconId);

  const filteredOptions = PWA_ICON_OPTIONS.filter((opt) => {
    if (activeCategory === "all") return true;
    return opt.category === activeCategory;
  });

  return (
    <div className="space-y-4 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-[var(--app-foreground)]" />
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--app-foreground)]">
              Icône de l'Application sur votre Téléphone
            </h3>
            <p className="text-[10px] text-neutral-400">
              Choisissez le logo et le nom qui s'afficheront sur votre écran d'accueil après installation.
            </p>
          </div>
        </div>

        {/* Filtres de catégories */}
        <div className="flex items-center gap-1 bg-[var(--app-surface-soft)] p-1 rounded-2xl border border-[var(--app-border)] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
              activeCategory === "all"
                ? "bg-[var(--app-foreground)] text-[var(--app-background)] shadow-sm"
                : "text-neutral-400 hover:text-[var(--app-foreground)]"
            }`}
          >
            Tous
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("official")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
              activeCategory === "official"
                ? "bg-[var(--app-foreground)] text-[var(--app-background)] shadow-sm"
                : "text-neutral-400 hover:text-[var(--app-foreground)]"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Officiels</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("disguise")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
              activeCategory === "disguise"
                ? "bg-[var(--app-foreground)] text-[var(--app-background)] shadow-sm"
                : "text-neutral-400 hover:text-[var(--app-foreground)]"
            }`}
          >
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Camouflage</span>
          </button>
        </div>
      </div>

      {/* ── Aperçu en direct façon Écran de Smartphone ── */}
      <div className="p-4 rounded-3xl border border-[var(--app-border)] bg-[linear-gradient(135deg,var(--app-surface),var(--app-surface-raised))] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* Simulation icône smartphone */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg border border-black/10 transition-transform duration-300 transform hover:scale-105">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/pwa-icon?id=${currentIcon.id}`}
                alt={currentIcon.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-[10px] font-bold max-w-[70px] truncate text-center text-[var(--app-foreground)]">
              {currentIcon.appName}
            </span>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black">{currentIcon.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--app-surface-soft)] font-bold text-neutral-400">
                {currentIcon.badge}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-tight">
              Nom affiché : <strong className="text-[var(--app-foreground)]">« {currentIcon.appName} »</strong>
            </p>
          </div>
        </div>

        {justApplied && (
          <div className="flex items-center gap-1 text-[11px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Icône active !</span>
          </div>
        )}
      </div>

      {/* ── Grille des choix d'icônes ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {filteredOptions.map((opt) => {
          const isSelected = selectedIconId === opt.id;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelectIcon(opt.id)}
              className={`p-3.5 rounded-3xl border transition-all text-left flex items-center justify-between gap-3 overflow-hidden shadow-sm ${
                isSelected
                  ? "border-[var(--app-foreground)] bg-[var(--app-surface-raised)] ring-2 ring-[var(--app-foreground)]/20 scale-[1.01]"
                  : "border-[var(--app-border)] bg-[var(--app-surface)] hover:border-neutral-500 hover:bg-[var(--app-surface-soft)]"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md border border-black/10 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/pwa-icon?id=${opt.id}`}
                    alt={opt.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-xs truncate">{opt.name}</h4>
                  </div>
                  <p className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">
                    Nom : « {opt.appName} » · {opt.description}
                  </p>
                </div>
              </div>

              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition flex-shrink-0 ${
                  isSelected
                    ? "bg-[var(--app-foreground)] text-[var(--app-background)]"
                    : "border border-[var(--app-border)] text-transparent"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-3 rounded-2xl bg-[var(--app-surface-soft)] border border-[var(--app-border)] text-[11px] text-neutral-400 flex items-start gap-2">
        <Smartphone className="w-4 h-4 text-[var(--app-accent)] flex-shrink-0 mt-0.5" />
        <p>
          <strong className="text-[var(--app-foreground)]">Comment l'appliquer sur votre smartphone :</strong> Les systèmes Android et iOS enregistrent l'icône lors de l'ajout à l'écran d'accueil. Après avoir choisi une nouvelle icône, supprimez simplement l'ancien raccourci puis cliquez sur <em>« Installer sur l'écran d'accueil »</em> pour que votre téléphone affiche le nouveau logo ou le mode camouflage choisi.
        </p>
      </div>
    </div>
  );
}
