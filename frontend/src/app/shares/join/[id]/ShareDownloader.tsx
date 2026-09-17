"use client";

import React, { useEffect, useRef, useState } from "react";
import { Download, Loader2, Users, Gauge } from "lucide-react";
import type { FileShare } from "@/lib/api";
import { getWebTorrentClient, getAnnounceList } from "@/lib/webtorrent-client";
import { formatBytes, formatDuration } from "@/lib/format";
import SpeedLimitSelector from "../../SpeedLimitSelector";
import type { Torrent, TorrentOptions } from "webtorrent";

// Repli quand le streaming direct-disque n'est pas disponible (Safari, Firefox,
// mobile) : chaque fichier est chargé entièrement en mémoire (Blob) avant d'être
// proposé au téléchargement — risqué au-delà de cette taille, d'où l'avertissement.
const LARGE_FILE_WARNING_BYTES = 2 * 1024 * 1024 * 1024; // 2 Go

// `showDirectoryPicker` (File System Access API) n'a pas de type officiel stable
// dans toutes les versions de TypeScript — accès via une interface minimale locale
// plutôt qu'un `any` généralisé.
interface FileSystemAccessWindow extends Window {
  showDirectoryPicker?: (opts?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
}

function supportsStreamingToDisk(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as FileSystemAccessWindow).showDirectoryPicker === "function" &&
    !!navigator.storage?.getDirectory
  );
}

type Props = {
  share: FileShare;
  token: string;
};

export default function ShareDownloader({ share, token }: Props) {
  const [status, setStatus] = useState<"idle" | "connecting" | "downloading" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [peers, setPeers] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [downloadLimitMBps, setDownloadLimitMBps] = useState(0);
  const torrentRef = useRef<Torrent | null>(null);
  const canStream = supportsStreamingToDisk();

  useEffect(() => {
    return () => {
      torrentRef.current?.destroy();
    };
  }, []);

  const totalBytes = Number(share.totalSizeBytes);

  const handleDownload = async () => {
    setError(null);

    // Le choix du dossier doit se faire ICI, en tout premier, dans le prolongement
    // direct du clic — sollicité plus tard (ex: à la fin du téléchargement), le
    // navigateur refuse l'appel car l'activation utilisateur n'est plus valide.
    let rootDir: FileSystemDirectoryHandle | undefined;
    if (canStream) {
      try {
        rootDir = await (window as FileSystemAccessWindow).showDirectoryPicker!({ mode: "readwrite" });
        setStreaming(true);
      } catch (err) {
        // Annulé par l'utilisateur (ou refusé) : on retombe sur le repli Blob plutôt
        // que de bloquer le téléchargement.
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Sélecteur de dossier indisponible:", err);
        }
      }
    }

    setStatus("connecting");

    try {
      const client = await getWebTorrentClient(token);
      const announce = getAnnounceList(token);

      // Limite globale de téléchargement pour ce client (-1 = illimité chez WebTorrent).
      client.throttleDownload(downloadLimitMBps > 0 ? downloadLimitMBps * 1024 * 1024 : -1);

      const opts: TorrentOptions = rootDir ? ({ announce, rootDir } as TorrentOptions) : ({ announce } as TorrentOptions);

      client.add(share.magnetUri, opts, (torrent: Torrent) => {
        torrentRef.current = torrent;
        setStatus("downloading");

        const onProgress = () => {
          setProgress(torrent.progress);
          setPeers(torrent.numPeers);
          setDownloadSpeed(torrent.downloadSpeed);
          const remaining = torrent.timeRemaining;
          setEtaSeconds(Number.isFinite(remaining) ? remaining / 1000 : null);
        };
        torrent.on("download", onProgress);
        torrent.on("wire", onProgress);

        torrent.on("done", async () => {
          setProgress(1);
          setEtaSeconds(0);
          setStatus("done");

          // Avec `rootDir`, WebTorrent écrit déjà les pièces directement sur le
          // disque au fur et à mesure (fsa-chunk-store) : les fichiers sont
          // complets dans le dossier choisi, rien de plus à faire ici.
          if (rootDir) return;

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
          {canStream ? (
            <div className="text-[11px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-2.5">
              Écriture directe sur le disque disponible sur ce navigateur : on te demandera de choisir un
              dossier de destination, sans limite de mémoire liée à la taille du fichier.
            </div>
          ) : (
            totalBytes > LARGE_FILE_WARNING_BYTES && (
              <div className="text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-2.5">
                Ce partage est volumineux ({formatBytes(totalBytes)}) et ce navigateur ne permet pas
                l&apos;écriture directe sur le disque. Préférez Chrome ou Edge sur ordinateur pour éviter tout
                ralentissement.
              </div>
            )
          )}

          <SpeedLimitSelector
            label="Vitesse de téléchargement maximale"
            valueMBps={downloadLimitMBps}
            onChange={setDownloadLimitMBps}
          />

          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--app-accent,#25D366)] text-white font-bold text-sm hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
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
                `${Math.round(progress * 100)}%${streaming ? " · écriture disque directe" : ""}`
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
          {status === "downloading" && (
            <div className="text-[11px] text-neutral-400 text-right">
              {etaSeconds !== null ? `~${formatDuration(etaSeconds)} restantes` : "Estimation en cours..."}
            </div>
          )}
        </div>
      )}

      {status === "done" && (
        <div className="text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 font-bold text-center">
          {streaming
            ? "Téléchargement terminé — les fichiers ont été enregistrés dans le dossier choisi."
            : "Téléchargement terminé — vérifiez vos fichiers téléchargés."}
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
