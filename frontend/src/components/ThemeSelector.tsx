"use client";

import React, { useEffect, useState } from "react";
import { Check, Palette } from "lucide-react";
import { AVAILABLE_THEMES, resolveTheme, setTheme, type AppTheme } from "@/lib/theme";

export default function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState<AppTheme>("midnight");

  useEffect(() => {
    setCurrentTheme(resolveTheme());

    const handleThemeChange = () => {
      setCurrentTheme(resolveTheme());
    };

    window.addEventListener("themechange", handleThemeChange);
    return () => window.removeEventListener("themechange", handleThemeChange);
  }, []);

  const handleSelectTheme = (themeId: AppTheme) => {
    setCurrentTheme(themeId);
    setTheme(themeId);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Palette className="w-4 h-4 text-neutral-400" />
        <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
          Thèmes de l'application
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {AVAILABLE_THEMES.map((t) => {
          const isSelected = currentTheme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelectTheme(t.id)}
              className={`group relative p-4 rounded-3xl border transition-all text-left flex flex-col justify-between overflow-hidden shadow-sm ${
                isSelected
                  ? "border-[var(--app-foreground)] bg-[var(--app-surface-raised)] ring-2 ring-[var(--app-foreground)]/20 scale-[1.01]"
                  : "border-[var(--app-border)] bg-[var(--app-surface)] hover:border-neutral-500 hover:bg-[var(--app-surface-soft)]"
              }`}
            >
              {/* En-tête de la carte */}
              <div className="flex items-center justify-between w-full mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{t.emoji}</span>
                  <div>
                    <h4 className="font-black text-sm tracking-tight">{t.name}</h4>
                    <p className="text-[10px] text-neutral-400 leading-tight">{t.subtitle}</p>
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                    isSelected
                      ? "bg-[var(--app-foreground)] text-[var(--app-background)]"
                      : "border border-[var(--app-border)] text-transparent"
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Pastilles de prévisualisation des couleurs */}
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-[var(--app-border)]/60">
                <span className="text-[10px] font-bold text-neutral-400">Couleurs :</span>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-4 h-4 rounded-full border border-black/20 shadow-sm"
                    style={{ backgroundColor: t.bgPreview }}
                    title="Arrière-plan"
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-black/20 shadow-sm"
                    style={{ backgroundColor: t.cardPreview }}
                    title="Surface"
                  />
                  <div
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: t.primaryColor }}
                    title="Couleur primaire"
                  />
                  <div
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: t.accentColor }}
                    title="Couleur accentuée"
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
