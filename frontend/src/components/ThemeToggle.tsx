"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { initTheme, resolveThemeMode, toggleThemeMode, type ThemeMode } from "@/lib/theme";

type ThemeToggleProps = {
  className?: string;
};

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof document === "undefined") {
      return "dark";
    }
    return resolveThemeMode();
  });

  useEffect(() => {
    initTheme();

    const syncTheme = () => {
      setMode(resolveThemeMode());
    };

    syncTheme();
    window.addEventListener("storage", syncTheme);
    window.addEventListener("themechange", syncTheme);

    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("themechange", syncTheme);
    };
  }, []);

  const handleToggle = () => {
    const next = toggleThemeMode();
    setMode(next);
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center justify-center p-2.5 rounded-full hover:bg-[var(--app-surface-soft)] text-[var(--app-foreground)] transition-colors ${className ?? ""}`}
      aria-label="Basculer le mode sombre / clair"
      title={mode === "dark" ? "Basculer vers le mode clair" : "Basculer vers le mode sombre"}
    >
      {mode === "dark" ? (
        <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform" />
      ) : (
        <Moon className="w-5 h-5 text-neutral-700 hover:-rotate-12 transition-transform" />
      )}
    </button>
  );
}
