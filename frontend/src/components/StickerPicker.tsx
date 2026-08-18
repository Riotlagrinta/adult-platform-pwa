"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  STICKER_CATEGORIES,
  STICKERS,
  Sticker,
  StickerCategory,
  getCustomStickers,
  saveCustomSticker,
  deleteCustomSticker,
} from "@/lib/stickers";
import { Search, X, Sparkles, Plus, Loader2, Trash2 } from "lucide-react";
import { apiRequest, toPublicUrl } from "@/lib/api";

interface StickerPickerProps {
  onSelectSticker: (sticker: Sticker) => void;
  onClose: () => void;
  token?: string | null;
}

export default function StickerPicker({ onSelectSticker, onClose, token }: StickerPickerProps) {
  const [activeCategory, setActiveCategory] = useState<StickerCategory["id"]>("custom");
  const [search, setSearch] = useState("");
  const [customStickers, setCustomStickers] = useState<Sticker[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCustomStickers(getCustomStickers());
  }, []);

  const handleCreateSticker = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const upload = await apiRequest<{ file: { url: string; mimeType: string } }>("/files/media", {
        method: "POST",
        token,
        body: formData,
      });

      const stickerName = file.name.replace(/\.[^/.]+$/, "").slice(0, 20) || "Mon Sticker";
      const newSticker: Sticker = {
        id: `custom_${Date.now()}`,
        url: upload.file.url,
        name: stickerName,
        isCustom: true,
        category: "custom",
      };

      saveCustomSticker(newSticker);
      setCustomStickers(getCustomStickers());
      setActiveCategory("custom");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erreur lors de la création du sticker");
    } finally {
      setIsCreating(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteCustomSticker = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Supprimer ce sticker de votre collection ?")) return;
    deleteCustomSticker(id);
    setCustomStickers(getCustomStickers());
  };

  // Filtrage combiné (Preset + Custom)
  const allStickers = [...customStickers, ...STICKERS];
  const filteredStickers = allStickers.filter((sticker) => {
    if (search.trim()) {
      return sticker.name.toLowerCase().includes(search.toLowerCase().trim());
    }
    if (activeCategory === "custom") {
      return sticker.isCustom === true;
    }
    return sticker.category === activeCategory;
  });

  return (
    <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col w-full max-w-sm sm:max-w-md h-80 animate-slideUp select-none">
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

      {createError && (
        <div className="px-3 py-1 bg-red-500/10 text-red-400 text-[11px] border-b border-red-500/20">
          {createError}
        </div>
      )}

      {/* Grille de Stickers */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-4 sm:grid-cols-5 gap-2.5 content-start">
        {/* Bouton Créer un sticker (visible dans l'onglet 'Mes Stickers' ou quand pas de recherche) */}
        {(activeCategory === "custom" || !search.trim()) && (
          <label className="flex flex-col items-center justify-center p-2 rounded-2xl border-2 border-dashed border-[var(--app-border)] hover:border-[var(--app-foreground)] hover:bg-[var(--app-surface-soft)] active:scale-95 transition-all duration-150 cursor-pointer group text-center aspect-square">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              disabled={isCreating}
              onChange={handleCreateSticker}
            />
            {isCreating ? (
              <Loader2 className="w-6 h-6 animate-spin text-[var(--app-accent)]" />
            ) : (
              <>
                <Plus className="w-6 h-6 text-[var(--app-foreground)] group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-bold text-neutral-400 group-hover:text-[var(--app-foreground)] mt-1">
                  Créer
                </span>
              </>
            )}
          </label>
        )}

        {filteredStickers.map((sticker) => (
          <div
            key={sticker.id}
            onClick={() => onSelectSticker(sticker)}
            className="relative flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-[var(--app-surface-soft)] active:scale-90 hover:scale-105 transition-all duration-150 group cursor-pointer aspect-square"
            title={sticker.name}
          >
            {sticker.isCustom && sticker.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={toPublicUrl(sticker.url) ?? undefined}
                alt={sticker.name}
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain filter drop-shadow-md group-hover:scale-110 transition-transform rounded-xl"
                loading="lazy"
              />
            ) : (
              <span className="text-3xl sm:text-4xl filter drop-shadow-md select-none group-hover:scale-110 transition-transform">
                {sticker.emoji}
              </span>
            )}
            <span className="text-[9px] text-neutral-400 font-medium truncate w-full text-center mt-1 group-hover:text-[var(--app-foreground)]">
              {sticker.name}
            </span>

            {/* Bouton de suppression pour stickers personnalisés */}
            {sticker.isCustom && (
              <button
                onClick={(e) => handleDeleteCustomSticker(e, sticker.id)}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-red-500 opacity-0 group-hover:opacity-100 transition shadow-sm"
                title="Supprimer ce sticker"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {filteredStickers.length === 0 && activeCategory === "custom" && (
          <div className="col-span-full py-6 text-center text-neutral-500 text-xs flex flex-col items-center gap-1">
            <Sparkles className="w-5 h-5 opacity-40 text-[var(--app-accent)]" />
            <span className="font-bold">Vous n'avez pas encore créé de sticker.</span>
            <span className="text-[10px] text-neutral-400">Cliquez sur « Créer » pour ajouter une photo de votre galerie !</span>
          </div>
        )}

        {filteredStickers.length === 0 && activeCategory !== "custom" && (
          <div className="col-span-full py-8 text-center text-neutral-500 text-xs flex flex-col items-center gap-1">
            <Sparkles className="w-5 h-5 opacity-40" />
            <span>Aucun sticker trouvé pour "{search}"</span>
          </div>
        )}
      </div>

      {/* Barre d'Onglets Thématiques en bas (Style WhatsApp) */}
      <div className="p-1.5 border-t border-[var(--app-border)] bg-[var(--app-surface-raised)] flex items-center justify-around overflow-x-auto">
        {STICKER_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id && !search.trim();
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setSearch("");
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition flex-shrink-0 ${
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
