"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "./AuthProvider";
import { apiRequest, toPublicUrl } from "@/lib/api";
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react";

interface StoryItem {
  id: string;
  mediaUrl: string;
  mimeType: string;
  caption: string | null;
  createdAt: string;
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

  const fetchStories = async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ stories: StoryGroup[] }>("/stories", { token });
      setGroups(data.stories);
    } catch (err) {
      console.error("Erreur de chargement des stories :", err);
    }
  };

  useEffect(() => {
    if (token) fetchStories();
  }, [token]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      await apiRequest("/stories", {
        method: "POST",
        token,
        body: formData,
      });

      alert("Story publiée avec succès ! Elle disparaîtra dans 24 heures.");
      fetchStories();
    } catch (err) {
      alert("Erreur lors de l'envoi de la story : " + (err instanceof Error ? err.message : "Erreur"));
    } finally {
      setUploading(false);
    }
  };

  const openStories = (groupIndex: number) => {
    const group = groups[groupIndex];
    if (group.items.length === 0) {
      // Si c'est l'utilisateur actuel et qu'il n'a pas de story, on ouvre l'upload
      if (group.userId === user?.id) {
        fileInputRef.current?.click();
      }
      return;
    }
    setActiveGroupIndex(groupIndex);
    setActiveStoryIndex(0);
    setProgress(0);
  };

  const closeStories = () => {
    setActiveGroupIndex(null);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
  };

  const nextStory = () => {
    if (activeGroupIndex === null) return;
    const currentGroup = groups[activeGroupIndex];

    if (activeStoryIndex < currentGroup.items.length - 1) {
      // Passer à la story suivante de l'utilisateur actuel
      setActiveStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else if (activeGroupIndex < groups.length - 1) {
      // Passer à l'utilisateur suivant s'il a des stories
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
  };

  const prevStory = () => {
    if (activeGroupIndex === null) return;

    if (activeStoryIndex > 0) {
      // Revenir à la story précédente de l'utilisateur actuel
      setActiveStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else if (activeGroupIndex > 0) {
      // Revenir à l'utilisateur précédent s'il a des stories
      let prevIndex = activeGroupIndex - 1;
      while (prevIndex >= 0 && groups[prevIndex].items.length === 0) {
        prevIndex--;
      }
      if (prevIndex >= 0) {
        setActiveGroupIndex(prevIndex);
        // Se positionner sur sa dernière story
        setActiveStoryIndex(groups[prevIndex].items.length - 1);
        setProgress(0);
      } else {
        closeStories();
      }
    } else {
      closeStories();
    }
  };

  // Timer automatique pour les stories (5 secondes par story)
  useEffect(() => {
    if (activeGroupIndex === null) return;

    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    const intervalTime = 50; // Mettre à jour toutes les 50ms
    const totalDuration = 5000; // 5 secondes
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
  }, [activeGroupIndex, activeStoryIndex]);

  if (!user) return null;

  const activeGroup = activeGroupIndex !== null ? groups[activeGroupIndex] : null;
  const activeStory = activeGroup && activeStoryIndex < activeGroup.items.length ? activeGroup.items[activeStoryIndex] : null;

  return (
    <div className="w-full bg-[var(--app-surface)] border-b border-[var(--app-border)] select-none">
      {/* Sélecteur de fichier caché pour uploader une story */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
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

                {/* Bouton Plus sur l'avatar pour l'utilisateur actuel s'il n'a pas de story */}
                {isCurrentUser && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    disabled={uploading}
                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black border-2 border-[var(--app-surface)] flex items-center justify-center hover:scale-105 transition"
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

      {/* Visionneuse de Stories plein écran */}
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

          {/* En-tête (Avatar + Pseudo + Bouton Fermer) */}
          <div className="absolute top-8 inset-x-4 z-50 flex items-center justify-between text-white pointer-events-auto">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full border border-neutral-700 bg-neutral-800 text-white flex items-center justify-center font-bold text-xs overflow-hidden flex-shrink-0">
                {activeGroup.avatarUrl ? (
                  <img
                    src={toPublicUrl(activeGroup.avatarUrl) ?? undefined}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{activeGroup.displayName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <span className="font-bold text-xs">{activeGroup.displayName}</span>
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
              <img
                src={toPublicUrl(activeStory.mediaUrl) ?? undefined}
                alt="story content"
                className="w-full max-h-screen object-contain"
              />
            )}

            {/* Légende éventuelle (Caption) */}
            {activeStory.caption && (
              <div className="absolute bottom-10 inset-x-6 z-40 text-center text-white text-sm bg-black/50 backdrop-blur-md p-4 rounded-2xl border border-neutral-800/50 max-w-md mx-auto leading-relaxed">
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
