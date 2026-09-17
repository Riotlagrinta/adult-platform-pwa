"use client";

import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Share2, Plus, Copy, Check, Square, Loader2, Folder } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { listMyFileShares, stopFileShare, type FileShare } from "@/lib/api";

// `ShareCreatorPanel` importe (indirectement, via `webtorrent-client.ts`) le paquet
// `webtorrent`, qui dépend de WebRTC et casse la compilation s'il est atteignable
// depuis la passe de rendu serveur. `ssr: false` l'exclut entièrement de cette passe.
const ShareCreatorPanel = dynamic(() => import("./ShareCreatorPanel"), {
  ssr: false,
  loading: () => (
    <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-[var(--app-accent,#25D366)]" />
    </div>
  ),
});

function formatBytes(bytes: number): string {
  if (!bytes) return "0 o";
  const units = ["o", "Ko", "Mo", "Go", "To"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** exp).toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

function statusLabel(status: FileShare["status"], lastSeenActiveAt: string | null): { label: string; color: string } {
  if (status === "STOPPED") return { label: "Arrêté", color: "text-neutral-400" };
  if (status === "INACTIVE") return { label: "Hors ligne", color: "text-neutral-400" };
  if (!lastSeenActiveAt) return { label: "Actif", color: "text-emerald-500" };
  return { label: "En ligne", color: "text-emerald-500" };
}

export default function SharesPage() {
  const { token, ready } = useAuth();
  const [shares, setShares] = useState<FileShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadShares = useCallback(async () => {
    if (!token) return;
    try {
      const data = await listMyFileShares(token);
      setShares(data.shares);
    } catch (err) {
      console.error("Erreur de chargement des partages:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (ready) void loadShares();
  }, [ready, loadShares]);

  const handleCopy = (id: string) => {
    const url = `${window.location.origin}/shares/join/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleStop = async (id: string) => {
    if (!token) return;
    try {
      await stopFileShare(id, token);
      void loadShares();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de l'arrêt du partage");
    }
  };

  if (!ready || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--app-accent)]" />
      </div>
    );
  }

  return (
    <div className="bg-[var(--app-background)] min-h-screen p-4 pt-[calc(1rem+env(safe-area-inset-top))] md:p-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-[var(--app-surface-raised)] border border-[var(--app-border)] text-[var(--app-foreground)] shadow-sm">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-black text-xl tracking-tight uppercase">Partage de fichiers</h2>
            <p className="text-xs text-[var(--app-muted)]">Dossiers et fichiers volumineux, direct entre appareils.</p>
          </div>
        </div>
        {!showCreator && (
          <button
            onClick={() => setShowCreator(true)}
            className="p-2.5 rounded-full bg-[var(--app-accent,#25D366)] text-white shadow-sm hover:opacity-90 transition"
            title="Nouveau partage"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {showCreator && (
        <ShareCreatorPanel
          onShareCreated={() => void loadShares()}
          onClose={() => setShowCreator(false)}
        />
      )}

      {shares.length === 0 && !showCreator ? (
        <div className="text-center py-20 text-[var(--app-muted)] text-sm space-y-2">
          <Folder className="w-8 h-8 mx-auto opacity-40" />
          <p>Aucun partage pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shares.map((share, index) => {
            const { label, color } = statusLabel(share.status, share.lastSeenActiveAt);
            return (
              <div
                key={share.id}
                className="card-3d animate-slideUp flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]"
                style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm truncate">{share.title}</div>
                  <div className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                    <span className={`font-bold ${color}`}>{label}</span>
                    <span>· {formatBytes(Number(share.totalSizeBytes))}</span>
                    <span>· {share.fileCount} fichier(s)</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleCopy(share.id)}
                    className="p-2.5 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-raised)] hover:bg-[var(--app-surface-soft)] transition-colors"
                    title="Copier le lien"
                  >
                    {copiedId === share.id ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  {share.status !== "STOPPED" && (
                    <button
                      onClick={() => handleStop(share.id)}
                      className="p-2.5 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-raised)] hover:bg-red-500/15 text-red-500 transition-colors"
                      title="Arrêter"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
