"use client";

export const WALLPAPER_STORAGE_KEY = "chat_wallpaper";
export const CUSTOM_WALLPAPER_STORAGE_KEY = "chat_custom_wallpaper";
export const CUSTOM_DIMMING_STORAGE_KEY = "chat_wallpaper_dimming";
export const BUBBLE_COLOR_STORAGE_KEY = "chat_bubble_color";
export const BUBBLE_CUSTOM_HEX_STORAGE_KEY = "chat_bubble_custom_hex";

export interface BubbleColorPreset {
  id: string;
  name: string;
  bgHex: string;
  textHex: string;
}

export const BUBBLE_COLOR_PRESETS: BubbleColorPreset[] = [
  { id: "default", name: "Par défaut", bgHex: "", textHex: "" },
  { id: "whatsapp", name: "Vert WhatsApp", bgHex: "#059669", textHex: "#ffffff" },
  { id: "blue", name: "Bleu Royal", bgHex: "#2563eb", textHex: "#ffffff" },
  { id: "purple", name: "Violet VIP", bgHex: "#7c3aed", textHex: "#ffffff" },
  { id: "pink", name: "Rose Rubis", bgHex: "#db2777", textHex: "#ffffff" },
  { id: "orange", name: "Sunset Orange", bgHex: "#ea580c", textHex: "#ffffff" },
  { id: "amber", name: "Or Champagne", bgHex: "#d97706", textHex: "#ffffff" },
  { id: "cyan", name: "Cyan Océan", bgHex: "#0891b2", textHex: "#ffffff" },
  { id: "red", name: "Rouge Passion", bgHex: "#dc2626", textHex: "#ffffff" },
];

export function getSavedWallpaper(): string {
  if (typeof window === "undefined") return "default";
  const saved = localStorage.getItem(WALLPAPER_STORAGE_KEY);
  if (!saved || saved.startsWith("wallpaper-")) return "default";
  return saved;
}

export function getSavedCustomWallpaper(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CUSTOM_WALLPAPER_STORAGE_KEY);
}

export function getSavedCustomDimming(): number {
  if (typeof window === "undefined") return 40;
  const saved = localStorage.getItem(CUSTOM_DIMMING_STORAGE_KEY);
  if (saved && !isNaN(Number(saved))) {
    return Math.max(0, Math.min(85, Number(saved)));
  }
  return 40;
}

export function setChatWallpaper(wallpaperId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WALLPAPER_STORAGE_KEY, wallpaperId);
  window.dispatchEvent(new CustomEvent("chatwallpaperchange", { detail: { wallpaperId } }));
}

export function setCustomDimming(dimming: number) {
  if (typeof window === "undefined") return;
  const clamped = Math.max(0, Math.min(85, dimming));
  localStorage.setItem(CUSTOM_DIMMING_STORAGE_KEY, String(clamped));
  window.dispatchEvent(new CustomEvent("chatwallpaperchange", { detail: { dimming: clamped } }));
}

export function removeCustomWallpaper() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CUSTOM_WALLPAPER_STORAGE_KEY);
  setChatWallpaper("default");
}

export async function processAndSaveCustomWallpaper(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      return reject(new Error("Le fichier sélectionné doit être une image."));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(new Error("Impossible d'initialiser le rendu graphique."));
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);

        try {
          localStorage.setItem(CUSTOM_WALLPAPER_STORAGE_KEY, dataUrl);
          setChatWallpaper("custom");
          resolve(dataUrl);
        } catch (err) {
          reject(new Error("L'image est trop volumineuse pour être stockée en mémoire locale."));
        }
      };
      img.onerror = () => reject(new Error("Échec du chargement de l'image."));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Échec de la lecture du fichier image."));
    reader.readAsDataURL(file);
  });
}

export function getWallpaperContainerStyle(
  wallpaperId: string,
  customDataUrl: string | null,
  dimming: number = 40
): React.CSSProperties | undefined {
  if (wallpaperId === "custom" && customDataUrl) {
    const alpha = (dimming / 100).toFixed(2);
    return {
      backgroundImage: `linear-gradient(rgba(0, 0, 0, ${alpha}), rgba(0, 0, 0, ${alpha})), url("${customDataUrl}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
    };
  }
  return undefined;
}

// ── Gestion de la Couleur des Bulles de Message ──

export function getSavedBubbleColor(): string {
  if (typeof window === "undefined") return "default";
  return localStorage.getItem(BUBBLE_COLOR_STORAGE_KEY) || "default";
}

export function getSavedCustomBubbleHex(): string {
  if (typeof window === "undefined") return "#059669";
  return localStorage.getItem(BUBBLE_CUSTOM_HEX_STORAGE_KEY) || "#059669";
}

export function setBubbleColor(colorId: string, customHex?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BUBBLE_COLOR_STORAGE_KEY, colorId);
  if (customHex) {
    localStorage.setItem(BUBBLE_CUSTOM_HEX_STORAGE_KEY, customHex);
  }
  window.dispatchEvent(
    new CustomEvent("chatbubblecolorchange", {
      detail: { colorId, customHex: customHex || getSavedCustomBubbleHex() },
    })
  );
}

function isColorLight(hex: string): boolean {
  const cleanHex = hex.replace("#", "");
  if (cleanHex.length !== 6) return false;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
}

export function getBubbleStyle(
  colorId: string,
  customHex?: string
): React.CSSProperties | undefined {
  if (colorId === "default") {
    return undefined;
  }
  if (colorId === "custom") {
    const hex = customHex || getSavedCustomBubbleHex();
    const textHex = isColorLight(hex) ? "#000000" : "#ffffff";
    return {
      backgroundColor: hex,
      color: textHex,
      borderColor: "transparent",
    };
  }
  const preset = BUBBLE_COLOR_PRESETS.find((p) => p.id === colorId);
  if (!preset || !preset.bgHex) return undefined;
  return {
    backgroundColor: preset.bgHex,
    color: preset.textHex,
    borderColor: "transparent",
  };
}
