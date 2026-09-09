"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Palette,
  Upload,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  SunMedium,
  Loader2,
} from "lucide-react";
import {
  PREDEFINED_WALLPAPERS,
  getSavedWallpaper,
  getSavedCustomWallpaper,
  getSavedCustomDimming,
  setChatWallpaper,
  setCustomDimming,
  removeCustomWallpaper,
  processAndSaveCustomWallpaper,
  getWallpaperContainerStyle,
} from "@/lib/wallpaper";
import { haptics } from "@/lib/haptics";

interface ChatWallpaperSelectorProps {
  onChanged?: () => void;
}

export default function ChatWallpaperSelector({ onChanged }: ChatWallpaperSelectorProps) {
  const [currentWallpaper, setCurrentWallpaper] = useState("wallpaper-doodle-dark");
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [dimming, setDimming] = useState(40);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCurrentWallpaper(getSavedWallpaper());
    setCustomPhotoUrl(getSavedCustomWallpaper());
    setDimming(getSavedCustomDimming());

    const savedFs = localStorage.getItem("chat_font_size") as "small" | "medium" | "large";
    if (savedFs) setFontSize(savedFs);

    const handleSync = () => {
      setCurrentWallpaper(getSavedWallpaper());
      setCustomPhotoUrl(getSavedCustomWallpaper());
      setDimming(getSavedCustomDimming());
    };

    window.addEventListener("chatwallpaperchange", handleSync);
    return () => window.removeEventListener("chatwallpaperchange", handleSync);
  }, []);

  const handleSelectPredefined = (id: string) => {
    haptics.selection();
    setCurrentWallpaper(id);
    setChatWallpaper(id);
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
    setCurrentWallpaper("wallpaper-doodle-dark");
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
          className={`h-36 w-full rounded-3xl border border-[var(--app-border)] p-3.5 flex flex-col justify-between overflow-hidden shadow-inner relative transition-all duration-300 ${
            !isCustomActive ? currentWallpaper : ""
          }`}
        >
          {/* Fausse bulle reçue */}
          <div className="max-w-[75%] bg-[var(--app-surface)] text-[var(--app-foreground)] border border-[var(--app-border)] p-2.5 rounded-2xl rounded-tl-sm text-[11px] shadow-sm">
            <p className="leading-snug">Coucou ! Tu as vu le nouveau fond d&apos;écran ? ✨</p>
            <span className="text-[9px] text-neutral-400 block text-right mt-1">14:32</span>
          </div>

          {/* Fausse bulle envoyée */}
          <div className="max-w-[75%] self-end bg-[var(--app-foreground)] text-[var(--app-background)] p-2.5 rounded-2xl rounded-tr-sm text-[11px] shadow-sm font-medium">
            <p className="leading-snug">Magnifique ! C&apos;est tellement plus net et lisible 👌</p>
            <span className="text-[9px] opacity-75 block text-right mt-1">14:33</span>
          </div>
        </div>
      </div>

      {/* ── 2. Importation de Photo Personnalisée ── */}
      <div className="p-4 rounded-3xl bg-[var(--app-surface-soft)] border border-[var(--app-border)] space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center flex-shrink-0">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-black text-xs text-[var(--app-foreground)]">Photo de votre Galerie</h4>
              <p className="text-[10px] text-neutral-400">Importez une photo personnelle comme arrière-plan</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

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
            <span>{customPhotoUrl ? "Changer" : "Importer"}</span>
          </button>
        </div>

        {/* Réglage de contraste si photo active */}
        {customPhotoUrl && (
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

      {/* ── 3. Fonds Prédéfinis WhatsApp Style ── */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
          Ou choisissez un thème officiel
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {PREDEFINED_WALLPAPERS.map((wp) => {
            const isSelected = !isCustomActive && currentWallpaper === wp.id;
            return (
              <button
                key={wp.id}
                type="button"
                onClick={() => handleSelectPredefined(wp.id)}
                className={`p-3 rounded-2xl border text-left transition relative overflow-hidden flex flex-col justify-between h-20 shadow-sm active:scale-95 ${
                  isSelected
                    ? "border-[var(--app-accent,#25D366)] ring-2 ring-[var(--app-accent,#25D366)]/30"
                    : "border-[var(--app-border)] hover:border-neutral-400"
                } ${wp.bg}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-bold ${
                      wp.id === "wallpaper-doodle-light" ? "text-neutral-900" : "text-white"
                    }`}
                  >
                    {wp.name}
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-[var(--app-accent,#25D366)] flex-shrink-0" />
                  )}
                </div>
                <span
                  className={`text-[9px] ${
                    wp.id === "wallpaper-doodle-light" ? "text-neutral-600" : "text-neutral-400"
                  }`}
                >
                  {wp.desc}
                </span>
              </button>
            );
          })}
        </div>
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
