export type ThemeFamily = "midnight" | "sunset" | "gold" | "cyber";
export type ThemeMode = "dark" | "light";

export const THEME_FAMILY_STORAGE_KEY = "onlyadults_theme_family";
export const THEME_MODE_STORAGE_KEY = "onlyadults_theme_mode";

export interface ThemeFamilyDefinition {
  id: ThemeFamily;
  name: string;
  emoji: string;
  darkDescription: string;
  lightDescription: string;
  darkColors: {
    bg: string;
    card: string;
    primary: string;
    accent: string;
  };
  lightColors: {
    bg: string;
    card: string;
    primary: string;
    accent: string;
  };
}

export const THEME_FAMILIES: ThemeFamilyDefinition[] = [
  {
    id: "midnight",
    name: "Midnight Velvet",
    emoji: "🔮",
    darkDescription: "Améthyste profonde & Noir velours",
    lightDescription: "Lilas nacré & Perle satinée",
    darkColors: {
      bg: "#09070F",
      card: "#1A1429",
      primary: "#A855F7",
      accent: "#EC4899",
    },
    lightColors: {
      bg: "#F8F6FC",
      card: "#FFFFFF",
      primary: "#9333EA",
      accent: "#DB2777",
    },
  },
  {
    id: "sunset",
    name: "Sunset Passion",
    emoji: "🔥",
    darkDescription: "Rouge Rubis & Noir Charbon",
    lightDescription: "Rose Quartz & Blush chaleureux",
    darkColors: {
      bg: "#0D0608",
      card: "#220F18",
      primary: "#F43F5E",
      accent: "#FB923C",
    },
    lightColors: {
      bg: "#FFF5F5",
      card: "#FFFFFF",
      primary: "#E11D48",
      accent: "#EA580C",
    },
  },
  {
    id: "gold",
    name: "Gold Obsidian",
    emoji: "👑",
    darkDescription: "Noir Onyx & Or Champagne VIP",
    lightDescription: "Ivoire doré & Crème champagne",
    darkColors: {
      bg: "#090806",
      card: "#1D1912",
      primary: "#F59E0B",
      accent: "#D97706",
    },
    lightColors: {
      bg: "#FBF9F2",
      card: "#FFFFFF",
      primary: "#D97706",
      accent: "#B45309",
    },
  },
  {
    id: "cyber",
    name: "Cyber Neon",
    emoji: "⚡",
    darkDescription: "Cyan électrique & Nuit clubbing",
    lightDescription: "Cyan givré & Menthe d'eau",
    darkColors: {
      bg: "#04060C",
      card: "#101729",
      primary: "#06B6D4",
      accent: "#6366F1",
    },
    lightColors: {
      bg: "#F0FDFB",
      card: "#FFFFFF",
      primary: "#0891B2",
      accent: "#4F46E5",
    },
  },
];

export function resolveThemeFamily(): ThemeFamily {
  if (typeof window === "undefined") return "midnight";
  const saved = window.localStorage.getItem(THEME_FAMILY_STORAGE_KEY) as ThemeFamily | null;
  if (saved && THEME_FAMILIES.some((t) => t.id === saved)) {
    return saved;
  }
  return "midnight";
}

export function resolveThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem(THEME_MODE_STORAGE_KEY) as ThemeMode | null;
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  // Par défaut en mode sombre pour une plateforme adulte
  return "dark";
}

export function applyTheme(family: ThemeFamily, mode: ThemeMode) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.setAttribute("data-theme", family);

  if (mode === "dark") {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
}

export function initTheme() {
  if (typeof window === "undefined") return;
  applyTheme(resolveThemeFamily(), resolveThemeMode());
}

export function setThemeFamily(family: ThemeFamily) {
  if (typeof window === "undefined") return;
  const currentMode = resolveThemeMode();
  window.localStorage.setItem(THEME_FAMILY_STORAGE_KEY, family);
  applyTheme(family, currentMode);
  window.dispatchEvent(new Event("themechange"));
}

export function setThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  const currentFamily = resolveThemeFamily();
  window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
  applyTheme(currentFamily, mode);
  window.dispatchEvent(new Event("themechange"));
}

export function toggleThemeMode() {
  const nextMode = resolveThemeMode() === "dark" ? "light" : "dark";
  setThemeMode(nextMode);
  return nextMode;
}
