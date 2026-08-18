import { PWA_ICON_OPTIONS, getPwaIconById, type PwaIconOption } from "./pwa-icons";

export const PWA_ICON_STORAGE_KEY = "onlyadults_pwa_icon";

export function getSavedPwaIconId(): string {
  if (typeof window === "undefined") return "prestige";
  const saved = window.localStorage.getItem(PWA_ICON_STORAGE_KEY);
  if (saved && PWA_ICON_OPTIONS.some((opt) => opt.id === saved)) {
    return saved;
  }
  return "prestige";
}

export function applyPwaIcon(iconId: string) {
  if (typeof document === "undefined") return;

  const icon = getPwaIconById(iconId);

  // 1. Mettre à jour la balise <link rel="manifest">
  let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
  if (!manifestLink) {
    manifestLink = document.createElement("link");
    manifestLink.rel = "manifest";
    document.head.appendChild(manifestLink);
  }
  manifestLink.href = `/api/manifest?icon=${icon.id}&v=${Date.now()}`;

  // 2. Mettre à jour la balise <link rel="apple-touch-icon"> pour iOS Safari
  let appleIconLink = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
  if (!appleIconLink) {
    appleIconLink = document.createElement("link");
    appleIconLink.rel = "apple-touch-icon";
    document.head.appendChild(appleIconLink);
  }
  appleIconLink.href = `/api/pwa-icon?id=${icon.id}&size=192`;

  // 3. Mettre à jour le favicon du navigateur
  let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
  if (!faviconLink) {
    faviconLink = document.createElement("link");
    faviconLink.rel = "icon";
    document.head.appendChild(faviconLink);
  }
  faviconLink.href = `/api/pwa-icon?id=${icon.id}&size=192`;

  // 4. Mettre à jour les meta theme-color
  let metaTheme = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (metaTheme) {
    metaTheme.content = icon.themeColor;
  }
}

export function setPwaIcon(iconId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PWA_ICON_STORAGE_KEY, iconId);
  applyPwaIcon(iconId);
  window.dispatchEvent(new CustomEvent("pwaiconchange", { detail: { iconId } }));
}

export function initPwaIcon() {
  if (typeof window === "undefined") return;
  applyPwaIcon(getSavedPwaIconId());
}
