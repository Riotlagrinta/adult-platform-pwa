"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { initTheme, resolveTheme, setTheme, type Theme } from "@/lib/theme";

type ThemeToggleProps = {
  className?: string;
};

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document === "undefined") {
      return "light";
    }

    return document.documentElement.classList.contains("dark") ? "dark" : resolveTheme();
  });

  useEffect(() => {
    initTheme();

    const syncTheme = () => {
      setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
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
    const nextTheme = theme === "light" ? "dark" : "light";
    setThemeState(nextTheme);
    setTheme(nextTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center justify-center p-2.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 transition-colors ${className ?? ""}`}
      aria-label="Basculer le thème"
    >
      {theme === "light" ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5 text-amber-500" />
      )}
    </button>
  );
}
