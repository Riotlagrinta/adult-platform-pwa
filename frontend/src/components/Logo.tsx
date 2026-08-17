"use client";

import React from "react";

interface LogoProps {
  showText?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function Logo({ showText = true, className = "", size = "md" }: LogoProps) {
  const sizes = {
    sm: { svg: "h-7 w-7", text: "text-base", sub: "text-[8px]" },
    md: { svg: "h-10 w-10", text: "text-xl", sub: "text-[9px]" },
    lg: { svg: "h-14 w-14", text: "text-3xl", sub: "text-[11px]" },
  };

  return (
    <div className={`flex items-center gap-3 select-none font-bold tracking-tight text-[var(--app-foreground)] ${className}`}>
      {/* ── EMBLEME SVG VECTORIEL LUXE ONLYADULTS ── */}
      <div className="relative flex-shrink-0 group">
        <svg
          className={`${sizes[size].svg} transition-transform duration-300 group-hover:scale-105 filter drop-shadow-md`}
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Dégradé principal fluide */}
            <linearGradient id="oaGradientPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--app-accent, #a855f7)" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>

            {/* Dégradé de fond sombre & reflets */}
            <linearGradient id="oaGradientBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--app-surface-raised, #1a1429)" />
              <stop offset="100%" stopColor="var(--app-surface, #120e1d)" />
            </linearGradient>

            {/* Filtre de lueur interne */}
            <filter id="oaGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Anneau extérieur arrondi avec contour dégradé */}
          <rect
            x="6"
            y="6"
            width="108"
            height="108"
            rx="34"
            fill="url(#oaGradientBg)"
            stroke="url(#oaGradientPrimary)"
            strokeWidth="3.5"
          />

          {/* Lueur subtile centrale */}
          <circle cx="60" cy="60" r="30" fill="url(#oaGradientPrimary)" opacity="0.12" />

          {/* Le "O" majuscule stylisé */}
          <circle
            cx="60"
            cy="60"
            r="32"
            stroke="url(#oaGradientPrimary)"
            strokeWidth="7"
            strokeLinecap="round"
          />

          {/* Le "A" entrelacé géométrique */}
          <path
            d="M 60 33 L 42 78 L 50 78 L 60 52 L 70 78 L 78 78 Z"
            fill="url(#oaGradientPrimary)"
          />
          {/* Barre transversale du 'A' flottante */}
          <rect
            x="48"
            y="63"
            width="24"
            height="5"
            rx="2.5"
            fill="var(--app-foreground, #ffffff)"
          />

          {/* Étoile / Flamme supérieure VIP */}
          <path
            d="M 60 18 L 62.5 24 L 68 25 L 63.5 29 L 65 35 L 60 31.5 L 55 35 L 56.5 29 L 52 25 L 57.5 24 Z"
            fill="url(#oaGradientPrimary)"
            filter="url(#oaGlow)"
          />
        </svg>
      </div>

      {/* ── TYPOGRAPHIE DE MARQUE ── */}
      {showText && (
        <div className="flex flex-col">
          <div className={`${sizes[size].text} font-black tracking-tight leading-none flex items-center`}>
            <span className="bg-gradient-to-r from-[var(--app-accent,#a855f7)] to-pink-500 bg-clip-text text-transparent">
              ONLY
            </span>
            <span className="ml-1 text-[var(--app-foreground)] font-extrabold tracking-wide">
              ADULTS
            </span>
          </div>
          <span className={`${sizes[size].sub} uppercase tracking-[0.25em] text-neutral-400 font-bold mt-1`}>
            Club Privé 18+
          </span>
        </div>
      )}
    </div>
  );
}
