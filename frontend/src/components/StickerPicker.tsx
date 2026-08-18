"use client";

import React, { useState } from "react";
import { STICKER_CATEGORIES, STICKERS, Sticker, StickerCategory } from "@/lib/stickers";
import { Search, X, Sparkles } from "lucide-react";

interface StickerPickerProps {
  onSelectSticker: (sticker: Sticker) => void;
  onClose: () => void;
}

export default function StickerPicker({ onSelectSticker, onClose }: StickerPickerProps) {
  const [activeCategory, setActiveCategory] = useState<StickerCategory["id"]>("hot");
  const [search, setSearch] = useState("");

  const filteredStickers = STICKERS.filter((sticker) => {
    if (search.trim()) {
      return sticker.name.toLowerCase().includes(search.toLowerCase().trim());
    }
    return sticker.category === activeCategory;
  });

  return (
    <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col w-full max-w-sm sm:max-w-md h-72 animate-slideUp select-none">
      {/* Header avec Barre de Recherche & Fermeture */}
      <div className="p-2.5 border-b border-[var(--app-border)] flex items-center gap-2 bg-[var(--app-surface-raised)]">
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--app-surface)] border border-[var(--app-border)] text-xs">
          <Search className="w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un sticker..."
            className="w-full bg-transparent outline-none text-xs"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-neutral-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-[var(--app-surface-soft)] text-neutral-400 hover:text-white transition"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grille de Stickers */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-4 sm:grid-cols-5 gap-2.5 content-start">
        {filteredStickers.map((sticker) => (
          <button
            key={sticker.id}
            onClick={() => onSelectSticker(sticker)}
            className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-[var(--app-surface-soft)] active:scale-90 hover:scale-110 transition-all duration-150 group"
            title={sticker.name}
          >
            <span className="text-3xl sm:text-4xl filter drop-shadow-md select-none group-hover:scale-110 transition-transform">
              {sticker.emoji}
            </span>
            <span className="text-[9px] text-neutral-400 font-medium truncate w-full text-center mt-1 group-hover:text-[var(--app-foreground)]">
              {sticker.name}
            </span>
          </button>
        ))}

        {filteredStickers.length === 0 && (
          <div className="col-span-full py-8 text-center text-neutral-500 text-xs flex flex-col items-center gap-1">
            <Sparkles className="w-5 h-5 opacity-40" />
            <span>Aucun sticker trouvé pour "{search}"</span>
          </div>
        )}
      </div>

      {/* Barre d'Onglets Thématiques en bas (Style WhatsApp) */}
      <div className="p-1.5 border-t border-[var(--app-border)] bg-[var(--app-surface-raised)] flex items-center justify-around">
        {STICKER_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id && !search.trim();
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setSearch("");
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                isActive
                  ? "bg-[var(--app-foreground)] text-[var(--app-background)] shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-[var(--app-surface-soft)]"
              }`}
            >
              <span>{cat.icon}</span>
              <span className="hidden sm:inline text-[11px]">{cat.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
