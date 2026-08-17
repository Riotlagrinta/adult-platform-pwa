"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { initTheme, resolveTheme, setTheme, type AppTheme } from "@/lib/theme";

type ThemeToggleProps = {
  className?: string;
};

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (typeof document === "undefined") {
      return "midnight";
    }
    return resolveTheme();
  });

  useEffect(() => {
    initTheme();

    const syncTheme = () => {
      setThemeState(resolveTheme());
    };

    syncTheme();
    window.addEventListener("storage", syncTheme);
    window.addEventListener("themechange", syncTheme);

    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("themechange", syncTheme);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme: AppTheme = theme === "light" ? "midnight" : "light";
    setThemeState(nextTheme);
    setTheme(nextTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center justify-center p-2.5 rounded-full hover:bg-[var(--app-surface-soft)] text-[var(--app-foreground)] transition-colors ${className ?? ""}`}
      aria-label="Basculer le thème"
      title={theme === "light" ? "Passer en mode sombre" : "Passer en mode clair"}
    >
      {theme === "light" ? (
        <Moon className="w-5 h-5 text-neutral-700" />
      ) : (
        <Sun className="w-5 h-5 text-amber-400" />
      )}
    </button>
  );
}
