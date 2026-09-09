"use client";

export interface PredefinedWallpaper {
  id: string;
  name: string;
  desc: string;
  bg: string;
}

export const PREDEFINED_WALLPAPERS: PredefinedWallpaper[] = [
  { id: "wallpaper-doodle-dark", name: "WhatsApp Dark", desc: "Doodles sombres", bg: "bg-[#0b141a]" },
  { id: "wallpaper-doodle-light", name: "WhatsApp Clair", desc: "Doodles beiges", bg: "bg-[#efeae2]" },
  { id: "wallpaper-obsidian", name: "Obsidienne VIP", desc: "Carbone & Onyx", bg: "bg-[#07080a]" },
  { id: "wallpaper-emerald", name: "Émeraude Velvet", desc: "Vert WhatsApp", bg: "bg-[#061c16]" },
  { id: "wallpaper-midnight", name: "Bleu Minuit", desc: "Dégradé saphir", bg: "bg-[#070b19]" },
  { id: "wallpaper-sunset", name: "Sunset Rose", desc: "Rubis & Pourpre", bg: "bg-[#140711]" },
  { id: "wallpaper-gold", name: "Or Champagne", desc: "Onyx & Or VIP", bg: "bg-[#121008]" },
  { id: "wallpaper-solid", name: "Thème Uni", desc: "Fond dynamique", bg: "bg-[var(--app-background)]" },
];

export const WALLPAPER_STORAGE_KEY = "chat_wallpaper";
export const CUSTOM_WALLPAPER_STORAGE_KEY = "chat_custom_wallpaper";
export const CUSTOM_DIMMING_STORAGE_KEY = "chat_wallpaper_dimming";

export function getSavedWallpaper(): string {
  if (typeof window === "undefined") return "wallpaper-doodle-dark";
  return localStorage.getItem(WALLPAPER_STORAGE_KEY) || "wallpaper-doodle-dark";
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
  setChatWallpaper("wallpaper-doodle-dark");
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
          return reject(new Error("Impossible d\x27initialiser le rendu graphique."));
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);

        try {
          localStorage.setItem(CUSTOM_WALLPAPER_STORAGE_KEY, dataUrl);
          setChatWallpaper("custom");
          resolve(dataUrl);
        } catch (err) {
          reject(new Error("L\x27image est trop volumineuse pour être stockée en mémoire locale."));
        }
      };
      img.onerror = () => reject(new Error("Échec du chargement de l\x27image."));
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
