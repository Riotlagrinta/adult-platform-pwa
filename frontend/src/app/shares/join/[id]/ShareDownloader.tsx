"use client";

import React, { useEffect, useRef, useState } from "react";
import { Download, Loader2, Users, Gauge } from "lucide-react";
import type { FileShare } from "@/lib/api";
import { getWebTorrentClient, getAnnounceList } from "@/lib/webtorrent-client";
import type { Torrent, TorrentOptions } from "webtorrent";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 o";
  const units = ["o", "Ko", "Mo", "Go", "To"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** exp).toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

// Le repli v1 charge chaque fichier entièrement en mémoire (Blob) avant de déclencher
// son téléchargement — au-delà de cette taille, on prévient l'utilisateur plutôt que
// de risquer un onglet qui gèle ou plante (le streaming direct-disque via File System
// Access API est prévu en v2, cf. plan).
const LARGE_FILE_WARNING_BYTES = 2 * 1024 * 1024 * 1024; // 2 Go

type Props = {
  share: FileShare;
  token: string;
};

export default function ShareDownloader({ share, token }: Props) {
  const [status, setStatus] = useState<"idle" | "connecting" | "downloading" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [peers, setPeers] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const torrentRef = useRef<Torrent | null>(null);

  useEffect(() => {
    return () => {
      torrentRef.current?.destroy();
    };
  }, []);

  const totalBytes = Number(share.totalSizeBytes);

  const handleDownload = async () => {
    setStatus("connecting");
    setError(null);

    try {
      const client = await getWebTorrentClient(token);
      const announce = getAnnounceList(token);

      client.add(share.magnetUri, { announce } as TorrentOptions, (torrent: Torrent) => {
        torrentRef.current = torrent;
        setStatus("downloading");

        const onProgress = () => {
          setProgress(torrent.progress);
          setPeers(torrent.numPeers);
          setDownloadSpeed(torrent.downloadSpeed);
        };
        torrent.on("download", onProgress);
        torrent.on("wire", onProgress);

        torrent.on("done", async () => {
          setProgress(1);
          setStatus("done");
          for (const file of torrent.files) {
            try {
              const blob = await file.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = file.name;
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 30_000);
            } catch (err) {
              console.error(`Erreur de sauvegarde du fichier ${file.name}:`, err);
            }
          }
        });

        torrent.on("error", (err: Error | string) => {
          setStatus("error");
          setError(typeof err === "string" ? err : err.message);
        });
      });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Le téléchargement P2P n'est pas disponible sur ce navigateur.");
    }
  };

  return (
    <div className="space-y-3">
      {status === "idle" && (
        <>
          {totalBytes > LARGE_FILE_WARNING_BYTES && (
            <div className="text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-2.5">
              Ce partage est volumineux ({formatBytes(totalBytes)}). Préférez un navigateur de bureau
              (Chrome/Edge) et une connexion stable pour éviter tout ralentissement.
            </div>
          )}
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--app-accent,#25D366)] text-white font-bold text-sm hover:opacity-90 transition"
          >
            <Download className="w-4 h-4" />
            Télécharger
          </button>
        </>
      )}

      {(status === "connecting" || status === "downloading") && (
        <div className="space-y-2">
          <div className="h-2.5 rounded-full bg-[var(--app-surface-raised)] border border-[var(--app-border)] overflow-hidden">
            <div
              className="h-full bg-[var(--app-accent,#25D366)] transition-all duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span className="flex items-center gap-1">
              {status === "connecting" ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Connexion au partage...
                </>
              ) : (
                `${Math.round(progress * 100)}%`
              )}
            </span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> {peers}
              </span>
              <span className="flex items-center gap-1">
                <Gauge className="w-3 h-3" /> {formatBytes(downloadSpeed)}/s
              </span>
            </span>
          </div>
        </div>
      )}

      {status === "done" && (
        <div className="text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 font-bold text-center">
          Téléchargement terminé — vérifiez vos fichiers téléchargés.
        </div>
      )}

      {status === "error" && (
        <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-2xl p-3">
          {error ?? "Échec du téléchargement."}
        </div>
      )}
    </div>
  );
}
