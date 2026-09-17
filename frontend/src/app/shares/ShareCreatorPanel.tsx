"use client";

import React, { useEffect, useRef, useState } from "react";
import { FolderUp, FileUp, Loader2, Copy, Check, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { createFileShare, heartbeatFileShare, stopFileShare, type FileShare } from "@/lib/api";
import { getWebTorrentClient, getAnnounceList, preserveFolderStructure } from "@/lib/webtorrent-client";
import type { Torrent, TorrentOptions } from "webtorrent";

const HEARTBEAT_INTERVAL_MS = 60 * 1000;

function formatBytes(bytes: number): string {
  if (!bytes) return "0 o";
  const units = ["o", "Ko", "Mo", "Go", "To"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** exp).toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

type Props = {
  onShareCreated: () => void;
  onClose: () => void;
};

export default function ShareCreatorPanel({ onShareCreated, onClose }: Props) {
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"idle" | "seeding" | "registering" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [share, setShare] = useState<FileShare | null>(null);
  const [peers, setPeers] = useState(0);
  const [uploaded, setUploaded] = useState(0);
  const [copied, setCopied] = useState(false);

  const torrentRef = useRef<Torrent | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopSeeding = React.useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    torrentRef.current?.destroy();
    torrentRef.current = null;
  }, []);

  useEffect(() => {
    // Avertir avant fermeture : la fermeture de l'onglet arrête le seed immédiatement,
    // le fichier ne sera plus disponible pour les autres tant que personne ne le reseed.
    const handler = (e: BeforeUnloadEvent) => {
      if (torrentRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      stopSeeding();
    };
  }, [stopSeeding]);

  const handlePick = async (files: FileList | null) => {
    if (!files || files.length === 0 || !token) return;
    setError(null);
    setStatus("seeding");

    try {
      const list = preserveFolderStructure(files);
      const defaultTitle =
        title.trim() ||
        (list[0]?.webkitRelativePath ? list[0].webkitRelativePath.split("/")[0] : list[0]?.name) ||
        "Partage sans titre";
      setTitle(defaultTitle);

      const client = await getWebTorrentClient(token);
      const announce = getAnnounceList(token);

      client.seed(list, { name: defaultTitle, announce } as TorrentOptions, async (torrent: Torrent) => {
        torrentRef.current = torrent;

        torrent.on("upload", () => setUploaded(torrent.uploaded));
        torrent.on("wire", () => setPeers(torrent.numPeers));

        setStatus("registering");
        try {
          const manifest = torrent.files.map((f: Torrent["files"][number]) => ({ path: f.path, size: f.length }));
          const totalSizeBytes = torrent.files.reduce(
            (sum: number, f: Torrent["files"][number]) => sum + f.length,
            0
          );

          const { share: created } = await createFileShare(
            {
              title: defaultTitle,
              infoHash: torrent.infoHash,
              magnetUri: torrent.magnetURI,
              totalSizeBytes: String(totalSizeBytes),
              fileCount: torrent.files.length,
              manifest,
            },
            token
          );

          setShare(created);
          setStatus("ready");
          onShareCreated();

          heartbeatRef.current = setInterval(() => {
            heartbeatFileShare(created.id, token).catch(() => {
              /* best effort — une pulsation manquée est rattrapée par la suivante */
            });
          }, HEARTBEAT_INTERVAL_MS);
        } catch (err) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "Erreur lors de la création du partage.");
        }
      });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Le partage P2P n'est pas disponible sur ce navigateur.");
    }
  };

  const handleStop = async () => {
    stopSeeding();
    if (share && token) {
      await stopFileShare(share.id, token).catch(() => {});
    }
    onClose();
  };

  const shareUrl = share ? `${window.location.origin}/shares/join/${share.id}` : null;

  return (
    <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 space-y-4 shadow-sm animate-fadeIn">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-sm uppercase tracking-tight">Nouveau partage</h3>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--app-surface-soft)] text-neutral-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      {status === "idle" && (
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du partage (optionnel)"
            className="w-full px-4 py-2.5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] text-sm outline-none focus:border-[var(--app-accent,#25D366)]"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface-raised)] hover:bg-[var(--app-surface-soft)] cursor-pointer transition-colors">
              <FolderUp className="w-5 h-5 text-[var(--app-accent,#25D366)]" />
              <span className="text-xs font-bold">Un dossier</span>
              <input
                type="file"
                className="hidden"
                // @ts-expect-error - attribut non standard mais supporté par les navigateurs Chromium/Firefox
                webkitdirectory=""
                multiple
                onChange={(e) => handlePick(e.target.files)}
              />
            </label>
            <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface-raised)] hover:bg-[var(--app-surface-soft)] cursor-pointer transition-colors">
              <FileUp className="w-5 h-5 text-[var(--app-accent,#25D366)]" />
              <span className="text-xs font-bold">Des fichiers</span>
              <input type="file" className="hidden" multiple onChange={(e) => handlePick(e.target.files)} />
            </label>
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Le fichier reste sur votre appareil : il n&apos;est envoyé sur aucun serveur. Gardez cet onglet
            ouvert tant que vous voulez que d&apos;autres puissent le télécharger.
          </p>
        </div>
      )}

      {(status === "seeding" || status === "registering") && (
        <div className="flex items-center gap-3 py-6 justify-center text-sm text-neutral-500">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--app-accent,#25D366)]" />
          <span>{status === "seeding" ? "Préparation du partage..." : "Enregistrement..."}</span>
        </div>
      )}

      {status === "error" && (
        <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-2xl p-3">{error}</div>
      )}

      {status === "ready" && share && shareUrl && (
        <div className="space-y-3">
          <div className="text-xs text-neutral-500">
            <span className="font-bold text-[var(--app-foreground)]">{share.title}</span> ·{" "}
            {formatBytes(Number(share.totalSizeBytes))} · {share.fileCount} fichier(s)
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)]">
            <input readOnly value={shareUrl} className="flex-1 bg-transparent text-xs outline-none truncate" />
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="p-2 rounded-xl bg-[var(--app-accent,#25D366)] text-white flex-shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>{peers} pair(s) connecté(s)</span>
            <span>{formatBytes(uploaded)} envoyés</span>
          </div>
          <div className="text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-2.5">
            Gardez cet onglet ouvert : fermer la page arrête immédiatement le partage.
          </div>
          <button
            onClick={handleStop}
            className="w-full py-2.5 rounded-2xl border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold text-xs transition-colors"
          >
            Arrêter le partage
          </button>
        </div>
      )}
    </div>
  );
}
