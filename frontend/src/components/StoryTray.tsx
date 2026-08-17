"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { useAuth } from "./AuthProvider";
import { apiRequest, toPublicUrl } from "@/lib/api";
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Users,
  ShieldCheck,
  Send,
  Sparkles,
} from "lucide-react";

interface StoryItem {
  id: string;
  mediaUrl: string;
  mimeType: string;
  caption: string | null;
  visibility: "PUBLIC" | "FOLLOWERS" | "VERIFIED_ONLY";
  createdAt: string;
  expiresAt: string;
}

interface StoryGroup {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  verificationStatus: string;
  items: StoryItem[];
}

export default function StoryTray() {
  const { token, user } = useAuth();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [progress, setProgress] = useState(0);

  // États pour le Studio de Création de Story
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [durationHours, setDurationHours] = useState<number>(24);
  const [visibility, setVisibility] = useState<"PUBLIC" | "FOLLOWERS" | "VERIFIED_ONLY">("FOLLOWERS");

  const fetchStories = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ stories: StoryGroup[] }>("/stories", { token });
      setGroups(data.stories);
    } catch (err) {
      console.error("Erreur de chargement des stories :", err);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void fetchStories();
    }
  }, [fetchStories, token]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setCaption("");
    setDurationHours(24);
    setVisibility("FOLLOWERS");
    // Reset file input so same file can be selected again
    e.target.value = "";
  };

  const closeStudio = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption("");
  };

  const publishStory = async () => {
    if (!selectedFile || !token) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("durationHours", String(durationHours));
      formData.append("visibility", visibility);
      if (caption.trim()) {
        formData.append("caption", caption.trim());
      }

      await apiRequest("/stories", {
        method: "POST",
        token,
        body: formData,
      });

      closeStudio();
      alert(`Story publiée avec succès ! Durée : ${durationHours}h • Visibilité : ${visibility === "PUBLIC" ? "Publique" : visibility === "FOLLOWERS" ? "Abonnés" : "Vérifiés"}`);
      void fetchStories();
    } catch (err) {
      alert("Erreur lors de la publication : " + (err instanceof Error ? err.message : "Erreur"));
    } finally {
      setUploading(false);
    }
  };

  const openStories = (groupIndex: number) => {
    const group = groups[groupIndex];
    if (group.items.length === 0) {
      if (group.userId === user?.id) {
        fileInputRef.current?.click();
      }
      return;
    }
    setActiveGroupIndex(groupIndex);
    setActiveStoryIndex(0);
    setProgress(0);
  };

  const closeStories = useCallback(() => {
    setActiveGroupIndex(null);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
  }, []);

  const nextStory = useCallback(() => {
    if (activeGroupIndex === null) return;
    const currentGroup = groups[activeGroupIndex];

    if (activeStoryIndex < currentGroup.items.length - 1) {
      setActiveStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else if (activeGroupIndex < groups.length - 1) {
      let nextIndex = activeGroupIndex + 1;
      while (nextIndex < groups.length && groups[nextIndex].items.length === 0) {
        nextIndex++;
      }
      if (nextIndex < groups.length) {
        setActiveGroupIndex(nextIndex);
        setActiveStoryIndex(0);
        setProgress(0);
      } else {
        closeStories();
      }
    } else {
      closeStories();
    }
  }, [activeGroupIndex, activeStoryIndex, closeStories, groups]);

  const prevStory = useCallback(() => {
    if (activeGroupIndex === null) return;

    if (activeStoryIndex > 0) {
      setActiveStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else if (activeGroupIndex > 0) {
      let prevIndex = activeGroupIndex - 1;
      while (prevIndex >= 0 && groups[prevIndex].items.length === 0) {
        prevIndex--;
      }
      if (prevIndex >= 0) {
        setActiveGroupIndex(prevIndex);
        setActiveStoryIndex(groups[prevIndex].items.length - 1);
        setProgress(0);
      } else {
        closeStories();
      }
    } else {
      closeStories();
    }
  }, [activeGroupIndex, activeStoryIndex, closeStories, groups]);

  // Timer automatique pour les stories (5 secondes par story)
  useEffect(() => {
    if (activeGroupIndex === null) return;

    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    const intervalTime = 50;
    const totalDuration = 5000;
    const increment = (intervalTime / totalDuration) * 100;

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextStory();
          return 0;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [activeGroupIndex, activeStoryIndex, nextStory]);

  if (!user) return null;

  const activeGroup = activeGroupIndex !== null ? groups[activeGroupIndex] : null;
  const activeStory = activeGroup && activeStoryIndex < activeGroup.items.length ? activeGroup.items[activeStoryIndex] : null;

  return (
    <div className="w-full bg-[var(--app-surface)] border-b border-[var(--app-border)] select-none">
      {/* Sélecteur de fichier caché pour lancer le Studio */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,video/*"
      />

      <div className="flex items-center gap-4 overflow-x-auto py-4 px-4 hide-scrollbar">
        {groups.map((group, index) => {
          const isCurrentUser = group.userId === user.id;
          const hasStories = group.items.length > 0;

          return (
            <div
              key={group.userId}
              className="flex flex-col items-center flex-shrink-0 cursor-pointer"
              onClick={() => openStories(index)}
            >
              <div className="relative">
                {/* Cercle avec bordure dégradée active */}
                <div
                  className={`w-16 h-16 rounded-full p-[2.5px] flex items-center justify-center ${
                    hasStories
                      ? "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500"
                      : "border border-[var(--app-border)] bg-[var(--app-surface-raised)]"
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-[var(--app-surface)] border-[2px] border-[var(--app-surface)] overflow-hidden flex items-center justify-center">
                    {group.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={toPublicUrl(group.avatarUrl) ?? undefined}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-neutral-500 text-sm">
                        {group.displayName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bouton Plus sur l'avatar pour l'utilisateur connecté */}
                {isCurrentUser && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black border-2 border-[var(--app-surface)] flex items-center justify-center hover:scale-105 transition"
                    title="Ajouter une story"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <span className="text-[10px] font-bold text-neutral-500 mt-1 max-w-[70px] truncate text-center">
                {isCurrentUser ? "Votre story" : group.displayName}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── STUDIO DE CRÉATION DE STORY (Prévisualisation + Durée + Visibilité) ── */}
      {selectedFile && previewUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[110] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[var(--app-surface)] border border-[var(--app-border)] rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header du Studio */}
            <div className="px-5 py-4 border-b border-[var(--app-border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-500" />
                <h3 className="font-black text-sm uppercase tracking-tight">Studio Story</h3>
              </div>
              <button
                onClick={closeStudio}
                className="p-1.5 rounded-full hover:bg-[var(--app-surface-soft)] text-neutral-400 hover:text-[var(--app-foreground)] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenu : Aperçu et Réglages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Cadre de prévisualisation média */}
              <div className="w-full h-64 sm:h-72 rounded-2xl bg-black overflow-hidden flex items-center justify-center relative border border-[var(--app-border)]">
                {selectedFile.type.startsWith("video/") ? (
                  <video src={previewUrl} className="w-full h-full object-contain" autoPlay playsInline loop muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Aperçu story" className="w-full h-full object-contain" />
                )}
              </div>

              {/* Champ Légende */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Légende (optionnel)</label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Écrivez un message sur votre story..."
                  maxLength={120}
                  className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-3 text-sm outline-none focus:border-[var(--app-foreground)] transition"
                />
              </div>

              {/* Réglage de la Durée d'expiration */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  Durée de vie de la story
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { hours: 6, label: "6h (Flash)" },
                    { hours: 12, label: "12h" },
                    { hours: 24, label: "24h (Std)" },
                    { hours: 48, label: "48h (VIP)" },
                  ].map((item) => (
                    <button
                      key={item.hours}
                      type="button"
                      onClick={() => setDurationHours(item.hours)}
                      className={`py-2.5 px-2 rounded-2xl text-xs font-bold transition border text-center ${
                        durationHours === item.hours
                          ? "bg-[var(--app-foreground)] text-[var(--app-background)] border-[var(--app-foreground)] shadow-sm"
                          : "bg-[var(--app-surface-soft)] text-[var(--app-foreground)] border-transparent hover:border-[var(--app-border)]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Réglage de la Visibilité */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-neutral-400" />
                  Qui peut voir cette story ?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "PUBLIC", label: "Public", icon: Globe, desc: "Tous les membres" },
                    { value: "FOLLOWERS", label: "Abonnés", icon: Users, desc: "Mes followers" },
                    { value: "VERIFIED_ONLY", label: "Vérifiés ⭐", icon: ShieldCheck, desc: "Profils 18+ validés" },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = visibility === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setVisibility(item.value as any)}
                        className={`p-3 rounded-2xl text-left transition border flex flex-col gap-1 ${
                          isSelected
                            ? "bg-[var(--app-foreground)] text-[var(--app-background)] border-[var(--app-foreground)] shadow-sm"
                            : "bg-[var(--app-surface-soft)] text-[var(--app-foreground)] border-transparent hover:border-[var(--app-border)]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Icon className="w-3.5 h-3.5" />
                          <span>{item.label}</span>
                        </div>
                        <span className={`text-[10px] leading-tight ${isSelected ? "opacity-80" : "text-neutral-400"}`}>
                          {item.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="p-5 border-t border-[var(--app-border)] flex items-center gap-3">
              <button
                type="button"
                onClick={closeStudio}
                disabled={uploading}
                className="flex-1 py-3 rounded-full border border-[var(--app-border)] text-xs font-bold hover:bg-[var(--app-surface-soft)] transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={publishStory}
                disabled={uploading}
                className="flex-[2] py-3 rounded-full bg-gradient-to-r from-pink-500 to-red-500 hover:opacity-90 text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{uploading ? "Publication en cours..." : "Publier ma Story 🚀"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VISIONNEUSE DE STORIES PLEIN ÉCRAN ── */}
      {activeGroupIndex !== null && activeGroup && activeStory && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col justify-between select-none">
          {/* Barres de progression en haut */}
          <div className="absolute top-4 inset-x-4 z-50 flex gap-1.5">
            {activeGroup.items.map((_, idx) => (
              <div key={idx} className="flex-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{
                    width:
                      idx === activeStoryIndex
                        ? `${progress}%`
                        : idx < activeStoryIndex
                        ? "100%"
                        : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {/* En-tête (Avatar + Pseudo + Badge Visibilité + Bouton Fermer) */}
          <div className="absolute top-8 inset-x-4 z-50 flex items-center justify-between text-white pointer-events-auto">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full border border-neutral-700 bg-neutral-800 text-white flex items-center justify-center font-bold text-xs overflow-hidden flex-shrink-0">
                {activeGroup.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={toPublicUrl(activeGroup.avatarUrl) ?? undefined}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{activeGroup.displayName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xs">{activeGroup.displayName}</span>
                {activeStory.visibility && (
                  <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                    {activeStory.visibility === "PUBLIC" && "🌍 Public"}
                    {activeStory.visibility === "FOLLOWERS" && "👥 Abonnés"}
                    {activeStory.visibility === "VERIFIED_ONLY" && "⭐ Vérifiés"}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={closeStories}
              className="p-1.5 rounded-full bg-black/40 border border-neutral-800/40 backdrop-blur-md text-white hover:bg-neutral-900 transition flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Zones tactiles cliquables invisibles (Précédent / Suivant) */}
          <div className="absolute inset-y-0 left-0 w-1/4 z-30 cursor-pointer" onClick={prevStory} />
          <div className="absolute inset-y-0 right-0 w-1/4 z-30 cursor-pointer" onClick={nextStory} />

          {/* Contenu de la story (Image ou Vidéo) */}
          <div className="flex-1 w-full h-full flex items-center justify-center bg-neutral-950 relative">
            {activeStory.mimeType.startsWith("video/") ? (
              <video
                src={toPublicUrl(activeStory.mediaUrl) ?? undefined}
                className="w-full max-h-screen object-contain"
                autoPlay
                playsInline
                muted={false}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={toPublicUrl(activeStory.mediaUrl) ?? undefined}
                alt="story content"
                className="w-full max-h-screen object-contain"
              />
            )}

            {/* Légende éventuelle (Caption) */}
            {activeStory.caption && (
              <div className="absolute bottom-10 inset-x-6 z-40 text-center text-white text-sm bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-neutral-800/50 max-w-md mx-auto leading-relaxed shadow-lg">
                {activeStory.caption}
              </div>
            )}
          </div>

          {/* Flèches de navigation sur ordinateur */}
          <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 inset-x-8 justify-between z-40 pointer-events-none">
            <button
              onClick={prevStory}
              className="p-3 rounded-full bg-black/60 border border-neutral-800 text-white hover:bg-neutral-900 transition pointer-events-auto flex items-center justify-center shadow-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextStory}
              className="p-3 rounded-full bg-black/60 border border-neutral-800 text-white hover:bg-neutral-900 transition pointer-events-auto flex items-center justify-center shadow-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
