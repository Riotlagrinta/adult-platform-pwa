"use client";

import React, { useState } from "react";
import { Plus, Send, Lock, Unlock } from "lucide-react";
import AuthPanel from "@/components/AuthPanel";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest } from "@/lib/api";

export default function CreatePostPage() {
  const { token, ready } = useAuth();
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "FOLLOWERS" | "VERIFIED_ONLY">("PUBLIC");
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [allowDownload, setAllowDownload] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(10);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handlePublish = async () => {
    if (!token) return;
    if (!content.trim() && !selectedMedia) {
      setStatus("Veuillez écrire du contenu ou ajouter un média.");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      let mediaPayload:
        | {
            kind: "IMAGE" | "VIDEO";
            url: string;
            mimeType: string;
            allowDownload: boolean;
            durationSeconds?: number;
            expiresAt?: string;
          }
        | undefined;

      if (selectedMedia) {
        const formData = new FormData();
        formData.append("file", selectedMedia);
        const upload = await apiRequest<{ file: { url: string; mimeType: string } }>("/files/media", {
          method: "POST",
          token,
          body: formData,
        });

        mediaPayload = {
          kind: selectedMedia.type.startsWith("video/") ? "VIDEO" : "IMAGE",
          url: upload.file.url,
          mimeType: upload.file.mimeType,
          allowDownload,
          durationSeconds: isLocked ? durationSeconds : undefined,
          expiresAt: isLocked ? new Date(Date.now() + durationSeconds * 1000).toISOString() : undefined,
        };
      }

      await apiRequest("/posts", {
        method: "POST",
        token,
        body: JSON.stringify({
          caption: content,
          visibility,
          media: mediaPayload ? [mediaPayload] : undefined,
        }),
      });

      setContent("");
      setSelectedMedia(null);
      setIsLocked(false);
      setAllowDownload(false);
      setStatus("Publication envoyée.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erreur lors de la publication");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return <div className="p-6 text-sm text-neutral-500">Chargement...</div>;
  }

  if (!token) {
    return (
      <div className="p-4 md:p-6">
        <AuthPanel />
      </div>
    );
  }

  return (
    <div className="bg-[var(--app-background)] min-h-screen p-4 md:p-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] space-y-6">
      <div className="border-b border-[var(--app-border)] pb-4">
        <h2 className="font-black text-xl tracking-tight uppercase">Créer une publication</h2>
        <p className="text-xs text-neutral-500">Publiez du contenu avec une visibilité contrôlée.</p>
      </div>

      <div className="space-y-4 max-w-xl">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Exprimez-vous..."
          maxLength={500}
          rows={5}
          className="w-full p-4 bg-[var(--app-surface-soft)] border border-transparent focus:border-[var(--app-border)] rounded-2xl text-sm outline-none resize-none"
        />

        <div className="flex items-center gap-3">
          <label className="w-28 h-28 border-2 border-dashed border-[var(--app-border)] rounded-2xl flex flex-col items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition cursor-pointer">
            {selectedMedia ? (
              <div className="text-center text-[10px] font-bold px-2">
                {selectedMedia.name}
              </div>
            ) : (
              <>
                <Plus className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-bold">Photo/Vidéo</span>
              </>
            )}
            <input
              type="file"
              className="hidden"
              accept="image/*,video/*"
              onChange={(event) => setSelectedMedia(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black">Visibilité</div>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as typeof visibility)}
              className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl px-3 py-2 text-xs"
            >
              <option value="PUBLIC">Public</option>
              <option value="FOLLOWERS">Followers</option>
              <option value="VERIFIED_ONLY">Vérifiés</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4 text-neutral-400" />}
              <div>
                <span className="text-xs font-black block">Média temporaire</span>
                <span className="text-[10px] text-neutral-500">Durée et téléchargement contrôlés</span>
              </div>
            </div>
            <button
              onClick={() => setIsLocked(!isLocked)}
              type="button"
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${isLocked ? "bg-[var(--app-foreground)]" : "bg-[var(--app-surface-soft)]"}`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-[var(--app-background)] shadow absolute transition-transform ${
                  isLocked ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {isLocked && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-500">Durée de visibilité :</span>
                <select
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                  className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl px-3 py-2 text-xs"
                >
                  <option value="5">5 secondes</option>
                  <option value="10">10 secondes</option>
                  <option value="15">15 secondes</option>
                  <option value="30">30 secondes</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => setAllowDownload(!allowDownload)}
                className="flex items-center gap-2 font-bold"
              >
                {allowDownload ? "Téléchargement autorisé" : "Téléchargement interdit"}
              </button>
            </div>
          )}
        </div>

        {status && <div className="text-sm text-neutral-500">{status}</div>}

        <button
          onClick={handlePublish}
          disabled={loading}
          className="w-full bg-[var(--app-foreground)] text-[var(--app-background)] font-black py-3 rounded-full hover:opacity-85 transition text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{loading ? "Publication..." : "Publier sur mon flux"}</span>
        </button>
      </div>
    </div>
  );
}
