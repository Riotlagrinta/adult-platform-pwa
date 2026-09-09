"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Palette,
  Upload,
  Image as ImageIcon,
  Trash2,
  SunMedium,
  Loader2,
  MessageSquare,
  Pipette,
  Check,
} from "lucide-react";
import {
  getSavedWallpaper,
  getSavedCustomWallpaper,
  getSavedCustomDimming,
  setChatWallpaper,
  setCustomDimming,
  removeCustomWallpaper,
  processAndSaveCustomWallpaper,
  getWallpaperContainerStyle,
  BUBBLE_COLOR_PRESETS,
  getSavedBubbleColor,
  getSavedCustomBubbleHex,
  setBubbleColor,
  getBubbleStyle,
} from "@/lib/wallpaper";
import { haptics } from "@/lib/haptics";

interface ChatWallpaperSelectorProps {
  onChanged?: () => void;
}

export default function ChatWallpaperSelector({ onChanged }: ChatWallpaperSelectorProps) {
  const [currentWallpaper, setCurrentWallpaper] = useState("default");
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [dimming, setDimming] = useState(40);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");

  // Couleur des bulles
  const [bubbleColor, setBubbleColorState] = useState<string>("default");
  const [customBubbleHex, setCustomBubbleHexState] = useState<string>("#059669");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const colorPickerRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCurrentWallpaper(getSavedWallpaper());
    setCustomPhotoUrl(getSavedCustomWallpaper());
    setDimming(getSavedCustomDimming());
    setBubbleColorState(getSavedBubbleColor());
    setCustomBubbleHexState(getSavedCustomBubbleHex());

    const savedFs = localStorage.getItem("chat_font_size") as "small" | "medium" | "large";
    if (savedFs) setFontSize(savedFs);

    const handleSync = () => {
      setCurrentWallpaper(getSavedWallpaper());
      setCustomPhotoUrl(getSavedCustomWallpaper());
      setDimming(getSavedCustomDimming());
    };

    const handleBubbleSync = (e: any) => {
      if (e.detail) {
        setBubbleColorState(e.detail.colorId);
        if (e.detail.customHex) setCustomBubbleHexState(e.detail.customHex);
      } else {
        setBubbleColorState(getSavedBubbleColor());
        setCustomBubbleHexState(getSavedCustomBubbleHex());
      }
    };

    window.addEventListener("chatwallpaperchange", handleSync);
    window.addEventListener("chatbubblecolorchange", handleBubbleSync);
    return () => {
      window.removeEventListener("chatwallpaperchange", handleSync);
      window.removeEventListener("chatbubblecolorchange", handleBubbleSync);
    };
  }, []);

  const handleSelectBubbleColor = (colorId: string, hex?: string) => {
    haptics.selection();
    setBubbleColorState(colorId);
    if (hex) setCustomBubbleHexState(hex);
    setBubbleColor(colorId, hex);
    onChanged?.();
  };

  const handleCustomColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setCustomBubbleHexState(hex);
    setBubbleColorState("custom");
    setBubbleColor("custom", hex);
    onChanged?.();
  };

  const handleResetToDefaultWallpaper = () => {
    haptics.light();
    removeCustomWallpaper();
    setCurrentWallpaper("default");
    setCustomPhotoUrl(null);
    onChanged?.();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    haptics.medium();
    setIsProcessingPhoto(true);
    try {
      const dataUrl = await processAndSaveCustomWallpaper(file);
      setCustomPhotoUrl(dataUrl);
      setCurrentWallpaper("custom");
      haptics.success();
      onChanged?.();
    } catch (err: any) {
      alert(err?.message || "Impossible de charger cette image.");
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveCustom = () => {
    haptics.light();
    removeCustomWallpaper();
    setCustomPhotoUrl(null);
    setCurrentWallpaper("default");
    onChanged?.();
  };

  const handleDimmingChange = (newVal: number) => {
    setDimming(newVal);
    setCustomDimming(newVal);
    onChanged?.();
  };

  const handleFontSize = (size: "small" | "medium" | "large") => {
    haptics.selection();
    setFontSize(size);
    localStorage.setItem("chat_font_size", size);
    window.dispatchEvent(new CustomEvent("chatfontsizechange", { detail: { size } }));
    onChanged?.();
  };

  const isCustomActive = currentWallpaper === "custom" && Boolean(customPhotoUrl);
  const previewStyle = getWallpaperContainerStyle(currentWallpaper, customPhotoUrl, dimming);
  const sentBubbleStyle = getBubbleStyle(bubbleColor, customBubbleHex);

  return (
    <div className="space-y-5 select-none text-xs">
      {/* ── 1. Simulation Interactive du Chat ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-[var(--app-accent)]" />
            <span>Aperçu de votre discussion</span>
          </label>
          {isCustomActive && (
            <span className="text-[10px] font-black text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/20">
              Photo personnalisée
            </span>
          )}
        </div>

        <div
          style={previewStyle}
          className="h-40 w-full rounded-3xl border border-[var(--app-border)] p-3.5 flex flex-col justify-between overflow-hidden shadow-inner relative transition-all duration-300 bg-[var(--app-background)]"
        >
          {/* Fausse bulle reçue */}
          <div className="max-w-[75%] bg-[var(--app-surface)] text-[var(--app-foreground)] border border-[var(--app-border)] p-2.5 rounded-2xl rounded-tl-sm text-[11px] shadow-sm">
            <p className="leading-snug">Coucou ! Tu as vu le nouveau style de nos discussions ? ✨</p>
            <span className="text-[9px] text-neutral-400 block text-right mt-1">14:32</span>
          </div>

          {/* Fausse bulle envoyée avec couleur personnalisée */}
          <div
            style={sentBubbleStyle}
            className={`max-w-[75%] self-end p-2.5 rounded-2xl rounded-tr-sm text-[11px] shadow-sm font-medium transition-all duration-300 ${
              !sentBubbleStyle ? "bg-[var(--app-foreground)] text-[var(--app-background)]" : ""
            }`}
          >
            <p className="leading-snug">Magnifique ! La couleur des bulles est tellement élégante 👌</p>
            <span className="text-[9px] opacity-75 block text-right mt-1">14:33</span>
          </div>
        </div>
      </div>

      {/* ── 2. Choix de la Couleur des Bulles Envoyées ── */}
      <div className="p-4 rounded-3xl bg-[var(--app-surface-soft)] border border-[var(--app-border)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-black text-xs text-[var(--app-foreground)]">Couleur des bulles envoyées</h4>
              <p className="text-[10px] text-neutral-400">Choisissez la teinte de vos messages</p>
            </div>
          </div>

          {/* Bouton pipette / couleur libre */}
          <button
            type="button"
            onClick={() => colorPickerRef.current?.click()}
            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition text-[11px] font-bold ${
              bubbleColor === "custom"
                ? "border-[var(--app-accent)] bg-[var(--app-accent)]/15 text-[var(--app-accent)]"
                : "border-[var(--app-border)] bg-[var(--app-surface-raised)] text-neutral-400 hover:text-[var(--app-foreground)]"
            }`}
            title="Choisir une couleur sur mesure"
          >
            <Pipette className="w-3.5 h-3.5" />
            <span>Nuance libre</span>
            <input
              ref={colorPickerRef}
              type="color"
              value={customBubbleHex}
              onChange={handleCustomColorInput}
              className="sr-only"
            />
          </button>
        </div>

        {/* Grille de pastilles de couleurs */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 pt-1">
          {BUBBLE_COLOR_PRESETS.map((preset) => {
            const isSelected = bubbleColor === preset.id;
            const isDefault = preset.id === "default";

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectBubbleColor(preset.id)}
                title={preset.name}
                className={`relative group flex flex-col items-center gap-1.5 p-1 rounded-2xl transition-all active:scale-95 ${
                  isSelected ? "scale-105" : "hover:opacity-90"
                }`}
              >
                <div
                  style={!isDefault ? { backgroundColor: preset.bgHex } : undefined}
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center transition shadow-sm border ${
                    isDefault
                      ? "bg-gradient-to-br from-neutral-800 to-neutral-950 border-neutral-700 text-white"
                      : "border-white/20 text-white"
                  } ${
                    isSelected
                      ? "ring-2 ring-[var(--app-accent,#25D366)] ring-offset-2 ring-offset-[var(--app-surface)] shadow-md"
                      : ""
                  }`}
                >
                  {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
                <span
                  className={`text-[9px] font-bold truncate max-w-full text-center ${
                    isSelected ? "text-[var(--app-foreground)]" : "text-neutral-400"
                  }`}
                >
                  {isDefault ? "Sobre" : preset.name.split(" ")[0]}
                </span>
              </button>
            );
          })}

          {/* Pastille pour la couleur personnalisée */}
          {bubbleColor === "custom" && (
            <button
              type="button"
              onClick={() => colorPickerRef.current?.click()}
              title="Couleur personnalisée"
              className="relative flex flex-col items-center gap-1.5 p-1 rounded-2xl scale-105"
            >
              <div
                style={{ backgroundColor: customBubbleHex }}
                className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-md border border-white/30 text-white ring-2 ring-[var(--app-accent,#25D366)] ring-offset-2 ring-offset-[var(--app-surface)]"
              >
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <span className="text-[9px] font-bold text-[var(--app-foreground)] truncate">
                Libre
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── 3. Arrière-plan de la Discussion (Galerie ou Défaut) ── */}
      <div className="p-4 rounded-3xl bg-[var(--app-surface-soft)] border border-[var(--app-border)] space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center flex-shrink-0">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-black text-xs text-[var(--app-foreground)]">Fond d&apos;écran</h4>
              <p className="text-[10px] text-neutral-400">
                {isCustomActive ? "Photo personnalisée active" : "Fond sobre par défaut de l'application"}
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex items-center gap-1.5">
            {isCustomActive && (
              <button
                type="button"
                onClick={handleResetToDefaultWallpaper}
                className="px-3 py-2 rounded-2xl bg-[var(--app-surface-raised)] border border-[var(--app-border)] text-neutral-300 font-bold text-xs hover:bg-[var(--app-surface)] transition active:scale-95"
                title="Rétablir le fond par défaut"
              >
                Par défaut
              </button>
            )}

            <button
              type="button"
              disabled={isProcessingPhoto}
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-2xl bg-[var(--app-foreground)] text-[var(--app-background)] font-black text-xs hover:opacity-90 transition flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
            >
              {isProcessingPhoto ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{isCustomActive ? "Changer" : "Importer"}</span>
            </button>
          </div>
        </div>

        {/* Réglage de contraste si photo active */}
        {isCustomActive && (
          <div className="pt-3 border-t border-[var(--app-border)] space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold flex items-center gap-1.5 text-neutral-300">
                <SunMedium className="w-3.5 h-3.5 text-amber-400" />
                Assombrissement pour lisibilité du texte
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[var(--app-accent)]">{dimming}%</span>
                <button
                  type="button"
                  onClick={handleRemoveCustom}
                  className="p-1 rounded-lg text-red-400 hover:bg-red-500/15 transition"
                  title="Supprimer la photo importée"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="80"
              step="5"
              value={dimming}
              onChange={(e) => handleDimmingChange(Number(e.target.value))}
              className="w-full accent-[var(--app-accent)] cursor-pointer h-1.5 bg-[var(--app-surface-raised)] rounded-lg"
            />
          </div>
        )}
      </div>

      {/* ── 4. Taille de police des messages ── */}
      <div className="pt-2 border-t border-[var(--app-border)] flex items-center justify-between">
        <div>
          <div className="font-bold">Taille du texte dans les discussions</div>
          <div className="text-[10px] text-neutral-400">Adapte la taille des bulles pour votre confort</div>
        </div>
        <div className="flex items-center gap-1 bg-[var(--app-surface-soft)] p-1 rounded-2xl border border-[var(--app-border)]">
          {(["small", "medium", "large"] as const).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => handleFontSize(size)}
              className={`px-3 py-1 rounded-xl font-bold text-[10px] transition ${
                fontSize === size
                  ? "bg-[var(--app-foreground)] text-[var(--app-background)] shadow-sm"
                  : "text-neutral-400 hover:text-[var(--app-foreground)]"
              }`}
            >
              {size === "small" ? "Petite" : size === "medium" ? "Moyenne" : "Grande"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
