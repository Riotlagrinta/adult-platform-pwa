export type AppTheme = "midnight" | "sunset" | "gold" | "cyber" | "light";

export const THEME_STORAGE_KEY = "onlyadults_theme";

export interface ThemeDefinition {
  id: AppTheme;
  name: string;
  subtitle: string;
  emoji: string;
  primaryColor: string;
  accentColor: string;
  bgPreview: string;
  cardPreview: string;
}

export const AVAILABLE_THEMES: ThemeDefinition[] = [
  {
    id: "midnight",
    name: "Midnight Velvet",
    subtitle: "Améthyste sombre & Noir velours",
    emoji: "🔮",
    primaryColor: "#A855F7",
    accentColor: "#EC4899",
    bgPreview: "#09070F",
    cardPreview: "#1A1429",
  },
  {
    id: "sunset",
    name: "Sunset Passion",
    subtitle: "Rouge Rubis & Orange brûlant",
    emoji: "🔥",
    primaryColor: "#F43F5E",
    accentColor: "#FB923C",
    bgPreview: "#0D0608",
    cardPreview: "#220F18",
  },
  {
    id: "gold",
    name: "Gold Obsidian",
    subtitle: "Noir Onyx & Or Champagne VIP",
    emoji: "👑",
    primaryColor: "#F59E0B",
    accentColor: "#D97706",
    bgPreview: "#090806",
    cardPreview: "#1D1912",
  },
  {
    id: "cyber",
    name: "Cyber Neon",
    subtitle: "Cyan électrique & Nuit clubbing",
    emoji: "⚡",
    primaryColor: "#06B6D4",
    accentColor: "#6366F1",
    bgPreview: "#04060C",
    cardPreview: "#101729",
  },
  {
    id: "light",
    name: "Pure Pearl",
    subtitle: "Épure lumineuse & Nacre satinée",
    emoji: "✨",
    primaryColor: "#9333EA",
    accentColor: "#DB2777",
    bgPreview: "#F7F5F0",
    cardPreview: "#FFFFFF",
  },
];

export function resolveTheme(): AppTheme {
  if (typeof window === "undefined") {
    return "midnight";
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null;
  if (savedTheme && AVAILABLE_THEMES.some((t) => t.id === savedTheme)) {
    return savedTheme;
  }

  return "midnight";
}

export function applyTheme(theme: AppTheme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  // Appliquer l'attribut de thème
  root.setAttribute("data-theme", theme);

  if (theme === "light") {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  } else {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  }
}

export function initTheme() {
  if (typeof window === "undefined") {
    return;
  }

  applyTheme(resolveTheme());
}

export function setTheme(theme: AppTheme) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new Event("themechange"));
}
