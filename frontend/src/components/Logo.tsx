import React from "react";

interface LogoProps {
  showText?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function Logo({ showText = true, className = "", size = "md" }: LogoProps) {
  const sizes = {
    sm: { svg: "h-6 w-6", text: "text-lg" },
    md: { svg: "h-10 w-10", text: "text-2xl" },
    lg: { svg: "h-16 w-16", text: "text-4xl" },
  };

  return (
    <div className={`flex items-center gap-3 select-none font-bold tracking-tight text-black dark:text-white ${className}`}>
      {/* Symbole SVG minimaliste Noir & Blanc */}
      <svg
        className={`${sizes[size].svg} fill-current transition-transform duration-300 hover:scale-105`}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Fond du badge noir */}
        <circle cx="50" cy="50" r="48" className="fill-black dark:fill-white" />
        
        {/* Monogramme 'OA' stylisé blanc et noir */}
        {/* Le 'O' est représenté par l'anneau extérieur */}
        <circle cx="50" cy="50" r="32" className="fill-none stroke-white dark:stroke-black stroke-[8]" />
        
        {/* Le 'A' est représenté par un triangle interne stylisé et une barre */}
        <path
          d="M 50 28 L 32 68 L 40 68 L 50 44 L 60 68 L 68 68 Z"
          className="fill-white dark:fill-black"
        />
        <rect
          x="40"
          y="52"
          width="20"
          height="6"
          className="fill-white dark:fill-black"
        />
      </svg>

      {/* Texte du logo optionnel */}
      {showText && (
        <span className={`${sizes[size].text} font-black uppercase tracking-widest`}>
          Only<span className="font-light text-neutral-500 dark:text-neutral-400">Adults</span>
        </span>
      )}
    </div>
  );
}
