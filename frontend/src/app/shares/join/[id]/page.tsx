"use client";

import React, { useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Loader2, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getFileShare, toPublicUrl, type FileShare } from "@/lib/api";
import AuthPanel from "@/components/AuthPanel";

// Voir `shares/page.tsx` : tout ce qui touche à `webtorrent` doit rester hors de la
// passe de rendu serveur (`ssr: false`), sous peine d'échec de compilation Turbopack.
const ShareDownloader = dynamic(() => import("./ShareDownloader"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-8">
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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function JoinSharePage({ params }: PageProps) {
  const { id: shareId } = use(params);
  const router = useRouter();
  const { token, ready } = useAuth();

  const [share, setShare] = useState<FileShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !token) return;
    let cancelled = false;
    getFileShare(shareId, token)
      .then((data) => {
        if (!cancelled) setShare(data.share);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Partage introuvable.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, token, shareId]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--app-accent)]" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="p-4 md:p-6 min-h-screen bg-[var(--app-background)]">
        <AuthPanel />
      </div>
    );
  }

  return (
    <div className="bg-[var(--app-background)] min-h-screen p-4 pt-[calc(1rem+env(safe-area-inset-top))] md:p-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <button
        onClick={() => router.push("/shares")}
        className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-[var(--app-foreground)] mb-4 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Retour aux partages
      </button>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--app-accent,#25D366)]" />
        </div>
      ) : error || !share ? (
        <div className="text-center py-20 text-sm text-red-500">{error ?? "Partage introuvable."}</div>
      ) : (
        <div className="max-w-md mx-auto rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-xs overflow-hidden flex-shrink-0">
              {share.owner?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={toPublicUrl(share.owner.avatarUrl) ?? undefined}
                  alt={share.owner.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                (share.owner?.displayName ?? "??").slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">{share.owner?.displayName ?? "Utilisateur"}</div>
              <div className="text-[11px] text-neutral-400">partage un fichier avec vous</div>
            </div>
          </div>

          <div>
            <h1 className="font-black text-lg tracking-tight">{share.title}</h1>
            {share.description && <p className="text-xs text-neutral-400 mt-1">{share.description}</p>}
            <div className="text-xs text-neutral-400 mt-1.5">
              {formatBytes(Number(share.totalSizeBytes))} · {share.fileCount} fichier(s)
            </div>
          </div>

          {share.manifest?.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1 border-t border-[var(--app-border)] pt-3">
              {share.manifest.slice(0, 50).map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-neutral-400 truncate">
                  <FileText className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{entry.path}</span>
                  <span className="ml-auto flex-shrink-0">{formatBytes(entry.size)}</span>
                </div>
              ))}
              {share.manifest.length > 50 && (
                <div className="text-[11px] text-neutral-400 italic">+{share.manifest.length - 50} autre(s)</div>
              )}
            </div>
          )}

          {share.status === "INACTIVE" && (
            <div className="text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-2.5">
              Le propriétaire ne semble pas connecté actuellement. Le téléchargement peut échouer — réessayez
              plus tard.
            </div>
          )}

          <div className="border-t border-[var(--app-border)] pt-3">
            <ShareDownloader share={share} token={token} />
          </div>
        </div>
      )}
    </div>
  );
}
