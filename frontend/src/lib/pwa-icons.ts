export interface PwaIconOption {
  id: string;
  name: string;
  appName: string; // Nom affiché sous l'icône sur l'écran d'accueil du smartphone
  category: "official" | "disguise";
  badge: string;
  description: string;
  themeColor: string;
  bgColor: string;
}

export const PWA_ICON_OPTIONS: PwaIconOption[] = [
  {
    id: "prestige",
    name: "Midnight Velvet (Officiel)",
    appName: "OnlyAdults",
    category: "official",
    badge: "🔮 Améthyste",
    description: "Le logo emblématique d'OnlyAdults en améthyste sombre et rose fuchsia.",
    themeColor: "#A855F7",
    bgColor: "#09070F",
  },
  {
    id: "gold",
    name: "Gold Obsidian (VIP)",
    appName: "OnlyAdults VIP",
    category: "official",
    badge: "👑 Or Royal",
    description: "Version noire onyx et dorée champagne pour un standing grand luxe.",
    themeColor: "#F59E0B",
    bgColor: "#090806",
  },
  {
    id: "sunset",
    name: "Sunset Passion (Rubis)",
    appName: "OnlyAdults",
    category: "official",
    badge: "🔥 Rubis Ardent",
    description: "Teintes chaudes rouge rubis et coucher de soleil.",
    themeColor: "#F43F5E",
    bgColor: "#0D0608",
  },
  {
    id: "cyber",
    name: "Cyber Clubbing (Néon)",
    appName: "OnlyAdults",
    category: "official",
    badge: "⚡ Cyan Néon",
    description: "Style futuriste cyan électrique et bleu nuit.",
    themeColor: "#06B6D4",
    bgColor: "#04060C",
  },
  {
    id: "calculator",
    name: "Calculatrice (Camouflage)",
    appName: "Calculatrice",
    category: "disguise",
    badge: "🧮 Discrétion Totale",
    description: "Ressemble à une calculatrice standard pour une discrétion absolue sur votre écran d'accueil.",
    themeColor: "#3B82F6",
    bgColor: "#1E293B",
  },
  {
    id: "notes",
    name: "Mes Notes (Camouflage)",
    appName: "Mes Notes",
    category: "disguise",
    badge: "📝 Incognito",
    description: "Apparence de carnet de notes classique pour passer inaperçu.",
    themeColor: "#EAB308",
    bgColor: "#FEF08A",
  },
  {
    id: "fitness",
    name: "FitTrack (Camouflage)",
    appName: "FitTrack",
    category: "disguise",
    badge: "🏃‍♂️ Sport & Santé",
    description: "Apparence d'une application de suivi sportif et de santé.",
    themeColor: "#10B981",
    bgColor: "#064E3B",
  },
];

export function getPwaIconById(id: string): PwaIconOption {
  return PWA_ICON_OPTIONS.find((icon) => icon.id === id) ?? PWA_ICON_OPTIONS[0];
}

/**
 * Génère le SVG vectoriel haute définition de l'icône demandée
 */
export function generateIconSvg(iconId: string): string {
  const icon = getPwaIconById(iconId);

  if (icon.id === "calculator") {
    // Icône Calculatrice ultra-réaliste
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="calcBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
        <linearGradient id="btnOrange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f97316"/>
          <stop offset="100%" stop-color="#ea580c"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#calcBg)"/>
      <!-- Écran de calculatrice -->
      <rect x="64" y="64" width="384" height="96" rx="24" fill="#090d16" stroke="#334155" stroke-width="6"/>
      <text x="416" y="132" fill="#38bdf8" font-size="52" font-family="sans-serif" font-weight="900" text-anchor="end">0.00</text>
      <!-- Boutons -->
      <rect x="64" y="192" width="76" height="60" rx="16" fill="#334155"/>
      <text x="102" y="235" fill="#f8fafc" font-size="32" font-family="sans-serif" font-weight="bold" text-anchor="middle">C</text>
      <rect x="166" y="192" width="76" height="60" rx="16" fill="#334155"/>
      <text x="204" y="235" fill="#f8fafc" font-size="32" font-family="sans-serif" font-weight="bold" text-anchor="middle">+/-</text>
      <rect x="268" y="192" width="76" height="60" rx="16" fill="#334155"/>
      <text x="306" y="235" fill="#f8fafc" font-size="32" font-family="sans-serif" font-weight="bold" text-anchor="middle">%</text>
      <rect x="372" y="192" width="76" height="60" rx="16" fill="url(#btnOrange)"/>
      <text x="410" y="235" fill="#ffffff" font-size="36" font-family="sans-serif" font-weight="bold" text-anchor="middle">÷</text>

      <rect x="64" y="272" width="76" height="60" rx="16" fill="#1e293b" stroke="#334155" stroke-width="3"/>
      <text x="102" y="315" fill="#f8fafc" font-size="32" font-family="sans-serif" font-weight="bold" text-anchor="middle">7</text>
      <rect x="166" y="272" width="76" height="60" rx="16" fill="#1e293b" stroke="#334155" stroke-width="3"/>
      <text x="204" y="315" fill="#f8fafc" font-size="32" font-family="sans-serif" font-weight="bold" text-anchor="middle">8</text>
      <rect x="268" y="272" width="76" height="60" rx="16" fill="#1e293b" stroke="#334155" stroke-width="3"/>
      <text x="306" y="315" fill="#f8fafc" font-size="32" font-family="sans-serif" font-weight="bold" text-anchor="middle">9</text>
      <rect x="372" y="272" width="76" height="60" rx="16" fill="url(#btnOrange)"/>
      <text x="410" y="315" fill="#ffffff" font-size="36" font-family="sans-serif" font-weight="bold" text-anchor="middle">×</text>

      <rect x="64" y="352" width="76" height="60" rx="16" fill="#1e293b" stroke="#334155" stroke-width="3"/>
      <text x="102" y="395" fill="#f8fafc" font-size="32" font-family="sans-serif" font-weight="bold" text-anchor="middle">4</text>
      <rect x="166" y="352" width="76" height="60" rx="16" fill="#1e293b" stroke="#334155" stroke-width="3"/>
      <text x="204" y="395" fill="#f8fafc" font-size="32" font-family="sans-serif" font-weight="bold" text-anchor="middle">5</text>
      <rect x="268" y="352" width="76" height="60" rx="16" fill="#1e293b" stroke="#334155" stroke-width="3"/>
      <text x="306" y="395" fill="#f8fafc" font-size="32" font-family="sans-serif" font-weight="bold" text-anchor="middle">6</text>
      <rect x="372" y="352" width="76" height="60" rx="16" fill="url(#btnOrange)"/>
      <text x="410" y="395" fill="#ffffff" font-size="36" font-family="sans-serif" font-weight="bold" text-anchor="middle">-</text>

      <rect x="64" y="432" width="178" height="52" rx="16" fill="#1e293b" stroke="#334155" stroke-width="3"/>
      <text x="153" y="470" fill="#f8fafc" font-size="32" font-family="sans-serif" font-weight="bold" text-anchor="middle">0</text>
      <rect x="268" y="432" width="76" height="52" rx="16" fill="#1e293b" stroke="#334155" stroke-width="3"/>
      <text x="306" y="470" fill="#f8fafc" font-size="32" font-family="sans-serif" font-weight="bold" text-anchor="middle">.</text>
      <rect x="372" y="432" width="76" height="52" rx="16" fill="url(#btnOrange)"/>
      <text x="410" y="470" fill="#ffffff" font-size="36" font-family="sans-serif" font-weight="bold" text-anchor="middle">=</text>
    </svg>`;
  }

  if (icon.id === "notes") {
    // Icône Bloc-notes discret
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="noteBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="100%" stop-color="#fde047"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#noteBg)"/>
      <!-- Reliure du carnet -->
      <rect x="0" y="0" width="512" height="88" rx="0" fill="#eab308"/>
      <circle cx="96" cy="44" r="16" fill="#ca8a04"/>
      <circle cx="176" cy="44" r="16" fill="#ca8a04"/>
      <circle cx="256" cy="44" r="16" fill="#ca8a04"/>
      <circle cx="336" cy="44" r="16" fill="#ca8a04"/>
      <circle cx="416" cy="44" r="16" fill="#ca8a04"/>
      <!-- Lignes de texte du carnet -->
      <rect x="64" y="160" width="384" height="12" rx="6" fill="#a1a1aa"/>
      <rect x="64" y="220" width="340" height="12" rx="6" fill="#a1a1aa"/>
      <rect x="64" y="280" width="384" height="12" rx="6" fill="#a1a1aa"/>
      <rect x="64" y="340" width="280" height="12" rx="6" fill="#a1a1aa"/>
      <rect x="64" y="400" width="360" height="12" rx="6" fill="#a1a1aa"/>
      <!-- Stylo / Crayon -->
      <path d="M 380 340 L 440 400 L 410 430 L 350 370 Z" fill="#2563eb"/>
      <polygon points="350,370 330,440 410,430" fill="#f97316"/>
      <polygon points="330,440 320,450 340,445" fill="#0f172a"/>
    </svg>`;
  }

  if (icon.id === "fitness") {
    // Icône FitTrack discret
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="fitBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#064e3b"/>
          <stop offset="100%" stop-color="#022c22"/>
        </linearGradient>
        <linearGradient id="fitLine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#34d399"/>
          <stop offset="100%" stop-color="#10b981"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#fitBg)"/>
      <!-- Anneau d'activité -->
      <circle cx="256" cy="256" r="160" fill="none" stroke="#065f46" stroke-width="28"/>
      <circle cx="256" cy="256" r="160" fill="none" stroke="#10b981" stroke-width="28" stroke-dasharray="800" stroke-dashoffset="240" stroke-linecap="round"/>
      <!-- Rythme cardiaque / ECG -->
      <path d="M 120 256 L 190 256 L 220 180 L 260 330 L 290 220 L 320 270 L 340 256 L 392 256" fill="none" stroke="#6ee7b7" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="256" y="440" fill="#a7f3d0" font-size="34" font-family="sans-serif" font-weight="900" text-anchor="middle" letter-spacing="4">FITTRACK</text>
    </svg>`;
  }

  // Logos officiels OnlyAdults (Prestige, Gold, Sunset, Cyber)
  let primaryCol = "#a855f7";
  let accentCol = "#ec4899";
  let bgDark1 = "#1a1429";
  let bgDark2 = "#09070f";

  if (icon.id === "gold") {
    primaryCol = "#f59e0b";
    accentCol = "#d97706";
    bgDark1 = "#1d1912";
    bgDark2 = "#090806";
  } else if (icon.id === "sunset") {
    primaryCol = "#f43f5e";
    accentCol = "#fb923c";
    bgDark1 = "#220f18";
    bgDark2 = "#0d0608";
  } else if (icon.id === "cyber") {
    primaryCol = "#06b6d4";
    accentCol = "#6366f1";
    bgDark1 = "#101729";
    bgDark2 = "#04060c";
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <linearGradient id="oaIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${primaryCol}"/>
        <stop offset="100%" stop-color="${accentCol}"/>
      </linearGradient>
      <linearGradient id="oaIconBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${bgDark1}"/>
        <stop offset="100%" stop-color="${bgDark2}"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="112" fill="url(#oaIconBg)" stroke="url(#oaIconGrad)" stroke-width="14"/>
    <!-- Halo central -->
    <circle cx="256" cy="256" r="120" fill="url(#oaIconGrad)" opacity="0.15"/>
    <!-- Lettre O -->
    <circle cx="256" cy="256" r="136" fill="none" stroke="url(#oaIconGrad)" stroke-width="30" stroke-linecap="round"/>
    <!-- Lettre A entrelacée -->
    <path d="M 256 142 L 178 338 L 214 338 L 256 226 L 298 338 L 334 338 Z" fill="url(#oaIconGrad)"/>
    <rect x="204" y="272" width="104" height="22" rx="11" fill="#ffffff"/>
    <!-- Étoile VIP -->
    <path d="M 256 76 L 267 102 L 291 106 L 271 124 L 278 150 L 256 135 L 234 150 L 241 124 L 221 106 L 245 102 Z" fill="url(#oaIconGrad)"/>
  </svg>`;
}
