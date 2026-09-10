"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Phone, PhoneMissed, PhoneOutgoing, PhoneIncoming, Video, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useCall } from "@/context/CallContext";
import { apiRequest, toPublicUrl } from "@/lib/api";

type CallHistoryItem = {
  id: string;
  isOutgoing: boolean;
  isVideo: boolean;
  status: "RINGING" | "ENDED" | "MISSED" | "REJECTED";
  startedAt: string;
  connectedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  partner: { id: string; displayName: string; avatarUrl: string | null };
};

function formatCallTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Hier à ${time}`;
  return `${date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} à ${time}`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

export default function CallsPage() {
  const { token, ready } = useAuth();
  const { startCall } = useCall();
  const [calls, setCalls] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCalls = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ calls: CallHistoryItem[] }>("/calls", { token });
      setCalls(data.calls);
    } catch (err) {
      console.error("Erreur de chargement de l'historique des appels:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (ready) void loadCalls();
  }, [ready, loadCalls]);

  if (!ready || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--app-accent)]" />
      </div>
    );
  }

  return (
    <div className="bg-[var(--app-background)] min-h-screen p-4 pt-[calc(1rem+env(safe-area-inset-top))] md:p-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] space-y-4">
      <div className="flex items-center gap-3 border-b border-[var(--app-border)] pb-4">
        <div className="p-2 rounded-2xl bg-[var(--app-surface-raised)] border border-[var(--app-border)] text-[var(--app-foreground)] shadow-sm">
          <Phone className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-black text-xl tracking-tight uppercase">Appels</h2>
          <p className="text-xs text-[var(--app-muted)]">Historique de vos appels vocaux et vidéo.</p>
        </div>
      </div>

      {calls.length === 0 ? (
        <div className="text-center py-20 text-[var(--app-muted)] text-sm">
          Aucun appel pour le moment.
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map((call, index) => {
            const isMissed = !call.isOutgoing && (call.status === "MISSED" || call.status === "REJECTED");
            const statusColor = isMissed ? "text-rose-500" : "text-[var(--app-foreground)]";
            const StatusIcon = isMissed ? PhoneMissed : call.isOutgoing ? PhoneOutgoing : PhoneIncoming;

            return (
              <div
                key={call.id}
                className="card-3d animate-slideUp flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]"
                style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-[var(--app-foreground)] text-[var(--app-background)] flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0">
                    {call.partner.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={toPublicUrl(call.partner.avatarUrl) ?? undefined}
                        alt={call.partner.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      call.partner.displayName.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className={`font-bold text-sm truncate ${isMissed ? "text-rose-500" : "text-[var(--app-foreground)]"}`}>
                      {call.partner.displayName}
                    </div>
                    <div className={`text-xs flex items-center gap-1.5 mt-0.5 ${statusColor}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{formatCallTime(call.startedAt)}</span>
                      {call.durationSeconds ? <span>· {formatDuration(call.durationSeconds)}</span> : null}
                      {isMissed && <span className="font-bold">· Manqué</span>}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    startCall(
                      { id: call.partner.id, displayName: call.partner.displayName, avatarUrl: call.partner.avatarUrl },
                      call.isVideo
                    )
                  }
                  className="p-2.5 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-raised)] hover:bg-emerald-500/15 text-emerald-500 hover:-translate-y-0.5 transition-all duration-200 flex-shrink-0"
                  title={call.isVideo ? "Rappeler en vidéo" : "Rappeler"}
                >
                  {call.isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
