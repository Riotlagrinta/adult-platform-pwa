"use client";

import React, { useEffect, useState } from "react";
import { Check, Palette, Moon, Sun } from "lucide-react";
import {
  THEME_FAMILIES,
  resolveThemeFamily,
  resolveThemeMode,
  setThemeFamily,
  setThemeMode,
  type ThemeFamily,
  type ThemeMode,
} from "@/lib/theme";

export default function ThemeSelector() {
  const [currentFamily, setCurrentFamily] = useState<ThemeFamily>("midnight");
  const [currentMode, setCurrentMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    setCurrentFamily(resolveThemeFamily());
    setCurrentMode(resolveThemeMode());

    const handleThemeChange = () => {
      setCurrentFamily(resolveThemeFamily());
      setCurrentMode(resolveThemeMode());
    };

    window.addEventListener("themechange", handleThemeChange);
    return () => window.removeEventListener("themechange", handleThemeChange);
  }, []);

  const handleSelectFamily = (family: ThemeFamily) => {
    setCurrentFamily(family);
    setThemeFamily(family);
  };

  const handleSelectMode = (mode: ThemeMode) => {
    setCurrentMode(mode);
    setThemeMode(mode);
  };

  return (
    <div className="space-y-4">
      {/* ── En-tête et commutateur Mode Sombre / Mode Clair ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-neutral-400" />
          <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
            Univers & Palette Visuelle
          </span>
        </div>

        {/* Commutateur Dark / Light pour l'univers sélectionné */}
        <div className="flex items-center p-1 bg-[var(--app-surface-soft)] rounded-2xl border border-[var(--app-border)] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleSelectMode("dark")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              currentMode === "dark"
                ? "bg-[var(--app-foreground)] text-[var(--app-background)] shadow-sm"
                : "text-neutral-500 hover:text-[var(--app-foreground)]"
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Mode Sombre</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectMode("light")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              currentMode === "light"
                ? "bg-[var(--app-foreground)] text-[var(--app-background)] shadow-sm"
                : "text-neutral-500 hover:text-[var(--app-foreground)]"
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Mode Clair</span>
          </button>
        </div>
      </div>

      {/* ── Cartes d'univers thématiques ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {THEME_FAMILIES.map((t) => {
          const isSelected = currentFamily === t.id;
          const colors = currentMode === "dark" ? t.darkColors : t.lightColors;
          const description = currentMode === "dark" ? t.darkDescription : t.lightDescription;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelectFamily(t.id)}
              className={`group relative p-4 rounded-3xl border transition-all text-left flex flex-col justify-between overflow-hidden shadow-sm ${
                isSelected
                  ? "border-[var(--app-foreground)] bg-[var(--app-surface-raised)] ring-2 ring-[var(--app-foreground)]/20 scale-[1.01]"
                  : "border-[var(--app-border)] bg-[var(--app-surface)] hover:border-neutral-500 hover:bg-[var(--app-surface-soft)]"
              }`}
            >
              {/* En-tête de la carte */}
              <div className="flex items-center justify-between w-full mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{t.emoji}</span>
                  <div>
                    <h4 className="font-black text-sm tracking-tight">{t.name}</h4>
                    <p className="text-[10px] text-neutral-400 leading-tight mt-0.5">{description}</p>
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
              </div>

              {/* Pastilles de prévisualisation des couleurs selon le mode actif */}
              <div className="flex items-center justify-between w-full mt-auto pt-2.5 border-t border-[var(--app-border)]/60">
                <span className="text-[10px] font-bold text-neutral-400">
                  Nuances {currentMode === "dark" ? "Dark" : "Light"} :
                </span>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                    style={{ backgroundColor: colors.bg }}
                    title="Fond"
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                    style={{ backgroundColor: colors.card }}
                    title="Cartes"
                  />
                  <div
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: colors.primary }}
                    title="Couleur Principale"
                  />
                  <div
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: colors.accent }}
                    title="Accent"
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
